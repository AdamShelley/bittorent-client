XT : Exact Topic
DN : Display Name
TR : Tracker
XL : Exact Length
as : Accept source
WS : Webseed

btih : BitTorrent Info Hah
urn:btih:' SHA1 Hash of the torrentss info section

Usually encoded sh1 -> Base32 - more compact, excludes special characters

DHT Network

Network of bittorent clients (nodes)

finding peers with dht

- Extract info hash from urn:btih
- Query the DHT Network
- DHT respond with list of peers that claim to share the file
- My client connects and asks for metadata

Then:

- download info section
- ensure its valid by checking info hash matches info in magnet link

# Steps I need to do:

- Parse the mamgnet link
- Join the DHT network
- Query DHT for peers
- Fetch metadata from peers
- Verify metadata integrity
- download file pieces (as normal?)

Helpful Links:
https://www.bittorrent.org/beps/bep_0005.html
https://www.bittorrent.org/beps/bep_0009.html
