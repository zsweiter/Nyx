use colored::*;
use dialoguer::{Input, theme::ColorfulTheme};

pub fn print_ascii_banner() {
    let banner = r#"
██▓▒░ N Y X ░▒▓██
    ╔═╗╦ ╦╦ ╦
    ║ ║╚╦╝╚╦╝
    ╚═╝ ╩  ╩

▒▒▌ encrypted ▐▒▒
░░▌ no-trace  ▐░░
"#;
    println!("{}", banner.bright_cyan());
}

pub fn chat_prompt(user: &str) -> String {
    Input::with_theme(&ColorfulTheme::default())
        .with_prompt(format!("{} >", user.bright_green()))
        .interact_text()
        .unwrap()
}

pub fn print_message(sender: &str, msg: &str) {
    println!("{}: {}", sender.bright_yellow(), msg.bright_white());
}
