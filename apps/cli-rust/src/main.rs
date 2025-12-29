mod console {
    pub mod chat;
}
mod crypto;
mod peer {
    pub mod p2p;
}

use crypto::cipher::{Cipher, CipherError, MemoryStore};

use ctrlc;
use std::process;

#[tokio::main]
async fn main() -> () {
    ctrlc::set_handler(move || {
        println!("Bye...!");
        process::exit(0);
    })
    .expect("Error setting Ctrl-C handler");

    console::chat::print_ascii_banner();

    // Start cipher
    let pass = "testing";
    let mut cipher = setup(pass).expect("Failed to setup cipher");

    println!(
        "Cipher setup complete!: fingerprint: {}",
        cipher.export_fingerprint().unwrap()
    );
    println!("public key: {}", cipher.export_public_key().unwrap());

    let user = "Syx";
    let recipient = "Arcane";

    let peer_id = "arcane";
    let recipient_cipher = setup_recipient().expect("Failed to setup recipient cipher");
    let recipient_pub_key = recipient_cipher.export_public_key().unwrap();

    cipher
        .register_peer(peer_id, &recipient_pub_key)
        .expect("Failed to register peer");

    loop {
        let msg = console::chat::chat_prompt(user);
        if msg.trim().eq_ignore_ascii_case("/exit") {
            break;
        }

        let ghost = cipher.encrypt_text(&msg, peer_id).unwrap();

        console::chat::print_message(recipient, &ghost);
    }
}

fn setup(_password: &str) -> Result<Cipher<MemoryStore>, CipherError> {
    let mut cipher = Cipher::new(MemoryStore::new());

    println!("Generating keypairs!");
    cipher.init(None)?;

    Ok(cipher)
}

// Only por test
fn setup_recipient() -> Result<Cipher<MemoryStore>, CipherError> {
    let mut cipher = Cipher::new(MemoryStore::new());

    println!("Connecting...");
    cipher.init(None)?;

    Ok(cipher)
}
