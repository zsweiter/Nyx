mod console {
    pub mod chat;
}
mod crypto;
mod keyring;
mod peer {
    pub mod p2p;
}
mod keyring;
use std::env;
use std::fs;

fn main() -> () {
    let mut alice = crypto::cipher::Cipher::new(crypto::cipher::MemoryStore::new());
    let mut bob = crypto::cipher::Cipher::new(crypto::cipher::MemoryStore::new());

    alice.init(None).unwrap();
    bob.init(None).unwrap();

    let alice_pub = alice.export_public_key().unwrap();
    let bob_pub = bob.export_public_key().unwrap();

    alice.register_peer("bob", &bob_pub).unwrap();
    bob.register_peer("alice", &alice_pub).unwrap();

    let message = "Hello, Bob!";
    let encrypted = alice.encrypt_text(message, "bob").unwrap();
    let decrypted = bob.decrypt_text(&encrypted, "alice").unwrap();

    let fingerprint = alice.export_fingerprint().unwrap();
    println!("is ready {}", alice.is_ready());
    println!("fingerprint {}", fingerprint);

    println!("Encrypted message: {}", encrypted);
    println!("Decrypted message: {}", decrypted);
    assert_eq!(message, decrypted);

    assert_eq!(alice.has_peer("bob").unwrap(), true);
    assert_eq!(alice.has_peer("alice").unwrap(), false);

    // File encryption by alice
    let file_path = env::current_dir().unwrap();
    let file_bytes = fs::read(file_path.join("apps/cli-rust/.samples/bytes.jpg")).unwrap();

    let enc_bytes = alice.encrypt_bytes(&file_bytes, "bob").unwrap();

    fs::write(
        file_path.join("apps/cli-rust/.samples/bytes.enc"),
        &enc_bytes,
    )
    .unwrap();

    // File descryption by bob
    let dec_bytes = fs::read(file_path.join("apps/cli-rust/.samples/bytes.enc")).unwrap();
    let decoded_bytes = bob.decrypt_bytes(&dec_bytes, "alice").unwrap();

    fs::write(
        file_path.join("apps/cli-rust/.samples/bytes.dec.jpg"),
        &decoded_bytes,
    )
    .unwrap();

    alice.remove_peer("bob").unwrap();
    assert_eq!(alice.has_peer("bob").unwrap(), false);

    alice.clear_cache();
    bob.clear_cache();
}
