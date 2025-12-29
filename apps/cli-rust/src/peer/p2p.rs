use libp2p::{
    futures::StreamExt,
    identity,
    mdns::{tokio::Behaviour as Mdns, Config as MdnsConfig, Event as MdnsEvent},
    noise,
    swarm::{NetworkBehaviour, SwarmEvent},
    tcp, yamux, PeerId, Swarm, Transport, // <--- IMPORTANTE: 'Transport' es necesario para .upgrade()
};
use std::error::Error;
use std::time::Duration;

#[derive(NetworkBehaviour)]
#[behaviour(to_swarm = "MyBehaviourEvent")]
struct MyBehaviour {
    mdns: Mdns,
}

#[derive(Debug)]
enum MyBehaviourEvent {
    Mdns(MdnsEvent),
}

impl From<MdnsEvent> for MyBehaviourEvent {
    fn from(event: MdnsEvent) -> Self {
        MyBehaviourEvent::Mdns(event)
    }
}

pub struct P2PNode {
    pub peer_id: PeerId,
    pub swarm: Swarm<MyBehaviour>,
}

impl P2PNode {
    pub async fn new() -> Result<Self, Box<dyn Error>> {
        let id_keys = identity::Keypair::generate_ed25519();
        let peer_id = PeerId::from(id_keys.public());
        println!("Identidad local generada: {}", peer_id);

        let transport = tcp::tokio::Transport::new(tcp::Config::default().nodelay(true))
            .upgrade(libp2p::core::upgrade::Version::V1) // Requiere 'use libp2p::Transport'
            .authenticate(noise::Config::new(&id_keys).expect("Error config noise"))
            .multiplex(yamux::Config::default())
            .boxed();

        // 2. Configuración de mDNS (Async)
        // Nota: Ajustamos el ttl para detectar peers más rápido en pruebas
        let mdns_config = MdnsConfig {
            ttl: Duration::from_secs(20),
            query_interval: Duration::from_secs(5),
            ..Default::default()
        };
        let mdns = Mdns::new(mdns_config, peer_id)?;

        let behaviour = MyBehaviour { mdns };

        // 3. Construcción del Swarm
        // En v0.54, si construyes el transporte manualmente, usa Swarm::new 
        // y añade la configuración predeterminada.
        let swarm = Swarm::new(
            transport,
            behaviour,
            peer_id,
            libp2p::swarm::Config::with_tokio_executor() // <--- Nueva forma de asignar el executor
                .with_idle_connection_timeout(Duration::from_secs(60)),
        );

        Ok(Self { peer_id, swarm })
    }

    pub async fn run(&mut self) -> Result<(), Box<dyn Error>> {
        self.swarm.listen_on("/ip4/0.0.0.0/tcp/0".parse()?)?;

        loop {
            // select_next_some() requiere 'use futures::StreamExt'
            match self.swarm.select_next_some().await {
                SwarmEvent::NewListenAddr { address, .. } => {
                    println!("Escuchando en la dirección: {:?}", address);
                }
                SwarmEvent::Behaviour(MyBehaviourEvent::Mdns(MdnsEvent::Discovered(list))) => {
                    for (peer_id, _multiaddr) in list {
                        println!("--> mDNS descubrió al peer: {}", peer_id);
                    }
                }
                SwarmEvent::Behaviour(MyBehaviourEvent::Mdns(MdnsEvent::Expired(list))) => {
                    for (peer_id, _multiaddr) in list {
                        println!("<-- mDNS peer expiró: {}", peer_id);
                    }
                }
                _ => {}
            }
        }
    }
}