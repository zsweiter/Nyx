use aes_gcm::{
    aead::{rand_core::RngCore, Aead, KeyInit, Nonce, OsRng},
    Aes256Gcm,
};
use base64::{engine::general_purpose::URL_SAFE, Engine as _};
use p256::{elliptic_curve::ecdh::diffie_hellman, PublicKey, SecretKey};
use pbkdf2::pbkdf2_hmac;
use sha2::Digest;
use sha2::Sha256;
use std::collections::HashMap;
use thiserror::Error;
use zeroize::{Zeroize, ZeroizeOnDrop};

#[derive(Error, Debug)]
pub enum CipherError {
    #[error("Cipher not initialized")]
    NotInitialized,

    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),

    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),

    #[error("Peer not found: {0}")]
    PeerNotFound(String),

    #[error("Invalid key format")]
    InvalidKeyFormat,

    #[error("Storage error: {0}")]
    StorageError(String),

    #[error("Wrong password")]
    WrongPassword,
}

impl From<sha2::digest::InvalidLength> for CipherError {
    fn from(err: sha2::digest::InvalidLength) -> Self {
        CipherError::EncryptionFailed(format!("Hash error: {:?}", err))
    }
}

pub trait Store: Send + Sync {
    fn setup(&mut self) -> Result<(), CipherError>;
    fn put(&mut self, id: &str, data: Vec<u8>) -> Result<(), CipherError>;
    fn get(&self, id: &str) -> Result<Option<Vec<u8>>, CipherError>;
    fn delete(&mut self, id: &str) -> Result<(), CipherError>;
    fn has(&self, id: &str) -> Result<bool, CipherError>;
}

pub struct MemoryStore {
    data: HashMap<String, Vec<u8>>,
}

impl MemoryStore {
    pub fn new() -> Self {
        Self {
            data: HashMap::new(),
        }
    }
}

impl Store for MemoryStore {
    fn setup(&mut self) -> Result<(), CipherError> {
        Ok(())
    }

    fn put(&mut self, id: &str, data: Vec<u8>) -> Result<(), CipherError> {
        self.data.insert(id.to_string(), data);
        Ok(())
    }

    fn get(&self, id: &str) -> Result<Option<Vec<u8>>, CipherError> {
        Ok(self.data.get(id).cloned())
    }

    fn delete(&mut self, id: &str) -> Result<(), CipherError> {
        self.data.remove(id);
        Ok(())
    }

    fn has(&self, id: &str) -> Result<bool, CipherError> {
        Ok(self.data.contains_key(id))
    }
}

#[derive(Zeroize, ZeroizeOnDrop)]
struct WrappingKey([u8; 32]);

#[derive(Zeroize, ZeroizeOnDrop)]
struct SharedSecret([u8; 32]);

#[derive(serde::Serialize, serde::Deserialize)]
struct StoredIdentity {
    public_key: Vec<u8>,
    encrypted_private_key: Vec<u8>,
    nonce: [u8; 12],
}

#[derive(serde::Serialize, serde::Deserialize)]
struct StoredSharedKey {
    encrypted_key: Vec<u8>,
    nonce: [u8; 12],
}

pub struct Cipher<S: Store> {
    store: S,
    wrapping_key: Option<WrappingKey>,
    identity_private: Option<SecretKey>,
    identity_public: Option<PublicKey>,
    peer_keys: HashMap<String, SharedSecret>,
    initialized: bool,
}

impl<S: Store> Cipher<S> {
    const PBKDF2_ITERATIONS: u32 = 600_000;

    pub fn new(store: S) -> Self {
        Self {
            store,
            wrapping_key: None,
            identity_private: None,
            identity_public: None,
            peer_keys: HashMap::new(),
            initialized: false,
        }
    }

    pub fn init(&mut self, password: Option<&str>) -> Result<(), CipherError> {
        if self.initialized {
            return Ok(());
        }

        self.store.setup()?;

        if let Some(pwd) = password {
            self.init_with_password(pwd)?;
        } else {
            self.init_basic()?;
        }

        self.load_or_create_identity()?;
        self.initialized = true;

        Ok(())
    }

    fn init_basic(&mut self) -> Result<(), CipherError> {
        // Generate or load wrapping key
        if let Some(data) = self.store.get("wrapping-key")? {
            if data.len() == 32 {
                let mut key = [0u8; 32];
                key.copy_from_slice(&data);
                self.wrapping_key = Some(WrappingKey(key));
            } else {
                return Err(CipherError::InvalidKeyFormat);
            }
        } else {
            let mut key = [0u8; 32];
            OsRng.fill_bytes(&mut key);
            self.wrapping_key = Some(WrappingKey(key));
            self.store.put("wrapping-key", key.to_vec())?;
        }

        Ok(())
    }

    fn init_with_password(&mut self, password: &str) -> Result<(), CipherError> {
        let salt = if let Some(data) = self.store.get("salt")? {
            data
        } else {
            let mut salt = vec![0u8; 32];
            OsRng.fill_bytes(&mut salt);
            self.store.put("salt", salt.clone())?;
            salt
        };

        let mut key = [0u8; 32];
        pbkdf2_hmac::<Sha256>(
            password.as_bytes(),
            &salt,
            Self::PBKDF2_ITERATIONS,
            &mut key,
        );

        self.wrapping_key = Some(WrappingKey(key));
        Ok(())
    }

    fn load_or_create_identity(&mut self) -> Result<(), CipherError> {
        if let Some(data) = self.store.get("identity")? {
            let stored: StoredIdentity = serde_json::from_slice(&data)
                .map_err(|e| CipherError::StorageError(e.to_string()))?;

            // Decrypt private key
            let wrapping_key = self
                .wrapping_key
                .as_ref()
                .ok_or(CipherError::NotInitialized)?;

            let raw_wrapping_key = &wrapping_key.0;
            let cipher = Aes256Gcm::new_from_slice(raw_wrapping_key)?;
            let nonce = Nonce::<Aes256Gcm>::from_slice(&stored.nonce);

            let decrypted = cipher
                .decrypt(nonce, stored.encrypted_private_key.as_ref())
                .map_err(|_| CipherError::WrongPassword)?;

            self.identity_private = Some(
                SecretKey::from_bytes((&decrypted[..]).into())
                    .map_err(|_| CipherError::InvalidKeyFormat)?,
            );

            self.identity_public = Some(
                PublicKey::from_sec1_bytes(&stored.public_key)
                    .map_err(|_| CipherError::InvalidKeyFormat)?,
            );
        } else {
            // Generate new identity
            let private = SecretKey::random(&mut OsRng);
            let public = private.public_key();

            // Encrypt private key with wrapping key
            let wrapping_key = self
                .wrapping_key
                .as_ref()
                .ok_or(CipherError::NotInitialized)?;

            let mut nonce_bytes = [0u8; 12];
            OsRng.fill_bytes(&mut nonce_bytes);
            let nonce = Nonce::<Aes256Gcm>::from_slice(&nonce_bytes);
            let cipher = Aes256Gcm::new_from_slice(&wrapping_key.0)?;

            let private_bytes = private.to_bytes();
            let encrypted = cipher
                .encrypt(nonce, private_bytes.as_ref())
                .map_err(|e| CipherError::EncryptionFailed(e.to_string()))?;

            let stored = StoredIdentity {
                public_key: public.to_sec1_bytes().to_vec(),
                encrypted_private_key: encrypted,
                nonce: nonce_bytes,
            };

            let serialized = serde_json::to_vec(&stored)
                .map_err(|e| CipherError::StorageError(e.to_string()))?;

            self.store.put("identity", serialized)?;
            self.identity_private = Some(private);
            self.identity_public = Some(public);
        }

        Ok(())
    }
    pub fn export_public_key(&self) -> Result<String, CipherError> {
        let public = self
            .identity_public
            .as_ref()
            .ok_or(CipherError::NotInitialized)?;

        let bytes = public.to_sec1_bytes();
        Ok(URL_SAFE.encode(&bytes))
    }

    pub fn export_fingerprint(&self) -> Result<String, CipherError> {
        let public = self
            .identity_public
            .as_ref()
            .ok_or(CipherError::NotInitialized)?;

        let bytes = public.to_sec1_bytes();
        let hash = sha2::Sha256::digest(&bytes);

        let fingerprint: String = hash[..16]
            .iter()
            .map(|b| format!("{:02X}", b))
            .collect::<Vec<_>>()
            .chunks(4)
            .map(|chunk| chunk.iter().cloned().collect::<String>())
            .collect::<Vec<_>>()
            .join(" ");

        Ok(fingerprint)
    }

    pub fn register_peer(
        &mut self,
        peer_id: &str,
        public_key_b64: &str,
    ) -> Result<(), CipherError> {
        if self.store.has(peer_id)? {
            return Ok(()); // Already registered
        }

        let public_key_bytes = URL_SAFE
            .decode(public_key_b64)
            .map_err(|_| CipherError::InvalidKeyFormat)?;

        let peer_public = PublicKey::from_sec1_bytes(&public_key_bytes)
            .map_err(|_| CipherError::InvalidKeyFormat)?;

        // Derive shared secret using ECDH
        let private = self
            .identity_private
            .as_ref()
            .ok_or(CipherError::NotInitialized)?;

        let shared_secret = diffie_hellman(private.to_nonzero_scalar(), peer_public.as_affine());

        let shared_bytes = shared_secret.raw_secret_bytes();
        let mut shared_key = [0u8; 32];
        shared_key.copy_from_slice(shared_bytes.as_slice());

        // Cache the shared key
        self.peer_keys
            .insert(peer_id.to_string(), SharedSecret(shared_key));

        // Encrypt and store
        let wrapping_key = self
            .wrapping_key
            .as_ref()
            .ok_or(CipherError::NotInitialized)?;

        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::<Aes256Gcm>::from_slice(&nonce_bytes);

        let cipher = Aes256Gcm::new_from_slice(&wrapping_key.0)?;
        let encrypted = cipher
            .encrypt(nonce, shared_key.as_ref())
            .map_err(|e| CipherError::EncryptionFailed(e.to_string()))?;

        let stored = StoredSharedKey {
            encrypted_key: encrypted,
            nonce: nonce_bytes,
        };

        let serialized =
            serde_json::to_vec(&stored).map_err(|e| CipherError::StorageError(e.to_string()))?;

        self.store.put(peer_id, serialized)?;

        Ok(())
    }

    pub fn remove_peer(&mut self, peer_id: &str) -> Result<(), CipherError> {
        self.peer_keys.remove(peer_id);
        self.store.delete(peer_id)?;
        Ok(())
    }

    pub fn has_peer(&self, peer_id: &str) -> Result<bool, CipherError> {
        self.store.has(peer_id)
    }

    fn get_peer_key(&mut self, peer_id: &str) -> Result<&SharedSecret, CipherError> {
        if !self.peer_keys.contains_key(peer_id) {
            // Load from storage
            let data = self
                .store
                .get(peer_id)?
                .ok_or_else(|| CipherError::PeerNotFound(peer_id.to_string()))?;

            let stored: StoredSharedKey = serde_json::from_slice(&data)
                .map_err(|e| CipherError::StorageError(e.to_string()))?;

            let wrapping_key = self
                .wrapping_key
                .as_ref()
                .ok_or(CipherError::NotInitialized)?;

            let raw_wrapping_key = &wrapping_key.0;
            let cipher = Aes256Gcm::new_from_slice(raw_wrapping_key)?;
            let nonce = Nonce::<Aes256Gcm>::from_slice(&stored.nonce);

            let decrypted = cipher
                .decrypt(nonce, stored.encrypted_key.as_ref())
                .map_err(|e| CipherError::DecryptionFailed(e.to_string()))?;

            let mut key = [0u8; 32];
            key.copy_from_slice(&decrypted);

            self.peer_keys
                .insert(peer_id.to_string(), SharedSecret(key));
        }

        Ok(self.peer_keys.get(peer_id).unwrap())
    }

    pub fn encrypt_text(&mut self, plaintext: &str, peer_id: &str) -> Result<String, CipherError> {
        let peer_key = self.get_peer_key(peer_id)?;

        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::<Aes256Gcm>::from_slice(&nonce_bytes);

        let cipher = Aes256Gcm::new_from_slice(&peer_key.0)?;
        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| CipherError::EncryptionFailed(e.to_string()))?;

        // Pack: [nonce (12 bytes) || ciphertext]
        let mut packed = Vec::with_capacity(12 + ciphertext.len());
        packed.extend_from_slice(&nonce_bytes);
        packed.extend_from_slice(&ciphertext);

        Ok(URL_SAFE.encode(&packed))
    }

    pub fn decrypt_text(
        &mut self,
        encrypted_b64: &str,
        peer_id: &str,
    ) -> Result<String, CipherError> {
        let peer_key = self.get_peer_key(peer_id)?;

        let packed = URL_SAFE
            .decode(encrypted_b64)
            .map_err(|_| CipherError::DecryptionFailed("Invalid base64".into()))?;

        if packed.len() < 12 {
            return Err(CipherError::DecryptionFailed("Message too short".into()));
        }

        let nonce = Nonce::<Aes256Gcm>::from_slice(&packed[..12]);
        let ciphertext = &packed[12..];

        let cipher = Aes256Gcm::new_from_slice(&peer_key.0)?;
        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| CipherError::DecryptionFailed(e.to_string()))?;

        String::from_utf8(plaintext)
            .map_err(|_| CipherError::DecryptionFailed("Invalid UTF-8".into()))
    }

    pub fn encrypt_bytes(&mut self, data: &[u8], peer_id: &str) -> Result<Vec<u8>, CipherError> {
        let peer_key = self.get_peer_key(peer_id)?;

        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::<Aes256Gcm>::from_slice(&nonce_bytes);
        let peer_bytes = &peer_key.0;

        let cipher = Aes256Gcm::new_from_slice(peer_bytes)?;
        let ciphertext = cipher
            .encrypt(nonce, data)
            .map_err(|e| CipherError::EncryptionFailed(e.to_string()))?;

        let mut packed = Vec::with_capacity(12 + ciphertext.len());
        packed.extend_from_slice(&nonce_bytes);
        packed.extend_from_slice(&ciphertext);

        Ok(packed)
    }

    pub fn decrypt_bytes(
        &mut self,
        encrypted: &[u8],
        peer_id: &str,
    ) -> Result<Vec<u8>, CipherError> {
        let peer_key = self.get_peer_key(peer_id)?;

        let mut nonce_bytes: [u8; 12] = [0u8; 12];
        if encrypted.len() < 12 {
            return Err(CipherError::DecryptionFailed("Message too short".into()));
        }

        nonce_bytes.copy_from_slice(&encrypted[..12]);

        let nonce = Nonce::<Aes256Gcm>::from_slice(&nonce_bytes);
        let ciphertext = &encrypted[12..];

        let cipher = Aes256Gcm::new_from_slice(&peer_key.0)?;
        cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| CipherError::DecryptionFailed(e.to_string()))
    }

    pub fn is_ready(&self) -> bool {
        self.initialized
    }

    pub fn clear_cache(&mut self) {
        self.peer_keys.clear();
    }
}
