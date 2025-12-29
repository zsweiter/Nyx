use keyring::Entry;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum KeyringError {
    #[error("Keyring operation failed: {0}")]
    OperationFailed(String),
}

pub struct SecretManager {
    service: String,
    user: String,
}

impl SecretManager {
    pub fn new(service: &str, user: &str) -> Self {
        Self {
            service: service.to_string(),
            user: user.to_string(),
        }
    }

    pub fn set_secret(&self, secret: &str) -> Result<(), KeyringError> {
        let entry = Entry::new(&self.service, &self.user).map_err(|e| KeyringError::OperationFailed(e.to_string()))?;
        entry.set_password(secret).map_err(|e| KeyringError::OperationFailed(e.to_string()))
    }

    pub fn get_secret(&self) -> Result<String, KeyringError> {
        let entry = Entry::new(&self.service, &self.user).map_err(|e| KeyringError::OperationFailed(e.to_string()))?;
        entry.get_password().map_err(|e| KeyringError::OperationFailed(e.to_string()))
    }

    pub fn delete_secret(&self) -> Result<(), KeyringError> {
        let entry = Entry::new(&self.service, &self.user).map_err(|e| KeyringError::OperationFailed(e.to_string()))?;
        entry.delete_credential().map_err(|e| KeyringError::OperationFailed(e.to_string()))
    }
}
use keyring::Entry;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum KeyringError {
    #[error("Keyring operation failed: {0}")]
    OperationFailed(String),
}

pub struct SecretManager {
    service: String,
    user: String,
}

impl SecretManager {
    pub fn new(service: &str, user: &str) -> Self {
        Self {
            service: service.to_string(),
            user: user.to_string(),
        }
    }

    pub fn set_secret(&self, secret: &str) -> Result<(), KeyringError> {
        let entry = Entry::new(&self.service, &self.user).map_err(|e| KeyringError::OperationFailed(e.to_string()))?;
        entry.set_password(secret).map_err(|e| KeyringError::OperationFailed(e.to_string()))
    }

    pub fn get_secret(&self) -> Result<String, KeyringError> {
        let entry = Entry::new(&self.service, &self.user).map_err(|e| KeyringError::OperationFailed(e.to_string()))?;
        entry.get_password().map_err(|e| KeyringError::OperationFailed(e.to_string()))
    }

    pub fn delete_secret(&self) -> Result<(), KeyringError> {
        let entry = Entry::new(&self.service, &self.user).map_err(|e| KeyringError::OperationFailed(e.to_string()))?;
        entry.delete_credential().map_err(|e| KeyringError::OperationFailed(e.to_string()))
    }
}
