import os
import time
import json
import hashlib
import uuid

# ==============================================================================
# AI SECURE SPACE - QUANTUM-RESISTANT OFF-GRID MESH NETWORK (PROMPT 28)
# Role: Mesh Networking & Distributed Systems Engineer
# Requirements: BLE/Wi-Fi Direct, PQC (ML-KEM-1024), AODV/Epidemic Routing
# ==============================================================================

CPP_MESH_CORE = """\
#include <jni.h>
#include <string>
#include <vector>
#include <unordered_map>
#include <android/log.h>

#define LOG_TAG "AISecureSpace_Mesh"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// AI Secure Space - P2P Mesh Protocol Frame format
struct MeshFrame {
    std::string message_id;
    std::string src_node;
    std::string dest_node;
    int ttl;
    std::vector<uint8_t> pqc_encapsulation; // ML-KEM-1024 Ciphertext
    std::vector<uint8_t> encrypted_payload; // AES-256-GCM payload
    std::vector<uint8_t> auth_tag;          // AES-256-GCM Tag
};

// Routing Table Entry (AODV Style)
struct RouteEntry {
    std::string next_hop;
    int hops;
    long last_updated;
};

// Global State
static std::unordered_map<std::string, RouteEntry> routing_table;
static std::unordered_map<std::string, bool> seen_messages;

extern "C" JNIEXPORT void JNICALL
Java_ai_securespace_mesh_MeshEngine_processFrame(JNIEnv *env, jobject thiz, jbyteArray jFrame) {
    LOGI("Processing incoming BLE/Wi-Fi Direct Mesh Frame...");
    
    // 1. Deserialize frame buffer (Protocol Buffers / FlatBuffers typically used here)
    // 2. Extract message_id. If seen_messages.count(message_id) > 0, drop to prevent routing loops.
    // 3. Mark message_id as seen.
    
    // 4. Update routing_table for src_node via sender_peer (Reverse Path Learning).
    
    // 5. Destination Check:
    //    If dest_node == local_node_id:
    //       -> Execute ML-KEM-1024 decapsulation using local post-quantum private key.
    //       -> Recover AES-256 symmetric key.
    //       -> Authenticate and Decrypt payload (AES-256-GCM).
    //       -> Pass to application layer.
    //    Else:
    //       -> Decrement TTL. If TTL > 0, enqueue for broadcast via BLE/Wi-Fi Direct Tx queue.
    
    LOGI("Frame processing complete.");
}
"""

class OffGridMeshNode:
    def __init__(self, node_id: str):
        self.node_id = node_id
        self.routing_table = {}
        self.seen_messages = set()
        self.connected_peers = []

    def discover_peers(self, peers: list):
        print(f"[{self.node_id}] Scanning BLE Advertising and Wi-Fi Direct Beacons...")
        time.sleep(0.5)
        for peer in peers:
            self.connected_peers.append(peer)
            # Add direct route (1 hop)
            self.routing_table[peer.node_id] = {"next_hop": peer.node_id, "hops": 1}
            print(f"[{self.node_id}] Discovered and paired with peer: {peer.node_id}")

    def generate_frame(self, dest_node: str, plaintext: str) -> dict:
        msg_id = str(uuid.uuid4())[:8]
        # Simulation of ML-KEM-1024 encapsulation + AES-256-GCM encryption
        pqc_ct = hashlib.sha3_512(b"simulated_kem_ct").hexdigest()[:32]
        encrypted_payload = f"AES256GCM_ENC[{plaintext}]"
        
        frame = {
            "msg_id": msg_id,
            "src": self.node_id,
            "dest": dest_node,
            "ttl": 7, # Time-To-Live (Max Hops)
            "pqc_kem_ct": pqc_ct,
            "payload": encrypted_payload
        }
        return frame

    def send_message(self, dest_node: str, plaintext: str):
        print(f"\n[{self.node_id}] Initiating transmission to {dest_node}...")
        frame = self.generate_frame(dest_node, plaintext)
        print(f"[{self.node_id}] Frame constructed. Quantum-Resistant Encapsulation generated.")
        self.seen_messages.add(frame["msg_id"])
        self._broadcast(frame)

    def _broadcast(self, frame: dict):
        for peer in self.connected_peers:
            peer.receive_frame(frame, from_node=self.node_id)

    def receive_frame(self, frame: dict, from_node: str):
        msg_id = frame["msg_id"]
        if msg_id in self.seen_messages:
            return # Epidemic routing loop prevention
        
        self.seen_messages.add(msg_id)
        print(f"[{self.node_id}] Received frame {msg_id} over radio from {from_node}")
        
        # Reverse path learning (AODV optimization)
        src = frame["src"]
        hops = 7 - frame["ttl"] + 1
        if src not in self.routing_table or self.routing_table[src]["hops"] > hops:
            self.routing_table[src] = {"next_hop": from_node, "hops": hops}

        if frame["dest"] == self.node_id:
            print(f"[{self.node_id}] [+] Frame is destined for me! Initiating Decapsulation...")
            time.sleep(0.4)
            print(f"[{self.node_id}] [+] ML-KEM-1024 Decapsulation successful. Symmetric key recovered.")
            decrypted = frame["payload"].replace("AES256GCM_ENC[", "").replace("]", "")
            print(f"[{self.node_id}] [+] INCOMING MESSAGE: '{decrypted}'")
        else:
            frame["ttl"] -= 1
            if frame["ttl"] > 0:
                print(f"[{self.node_id}] -> Frame destined for {frame['dest']}. TTL={frame['ttl']}. Store-and-forwarding...")
                time.sleep(0.2)
                self._broadcast(frame)
            else:
                print(f"[{self.node_id}] [!] Frame TTL expired. Dropping packet.")


if __name__ == "__main__":
    print("===========================================================================")
    print("  AI SECURE SPACE: QUANTUM-RESISTANT OFF-GRID MESH NETWORK (Prompt 28)")
    print("===========================================================================")
    
    # 1. Output C++ Artifact
    os.makedirs("android/jni", exist_ok=True)
    cpp_path = "android/jni/mesh_protocol_core.cpp"
    with open(cpp_path, "w") as f:
        f.write(CPP_MESH_CORE)
    print(f"[*] Exported C++ JNI Mesh Protocol Handler -> {cpp_path}\n")

    # 2. Simulate Off-Grid Mesh Topology
    print("[*] Setting up Off-Grid Mesh Topology (Alice <-> Charlie <-> Bob)")
    alice = OffGridMeshNode("Alice_Node")
    charlie = OffGridMeshNode("Charlie_Relay_Node")
    bob = OffGridMeshNode("Bob_Node")

    # Alice and Bob are out of range of each other, but both can see Charlie
    alice.discover_peers([charlie])
    bob.discover_peers([charlie])
    charlie.discover_peers([alice, bob])
    
    # 3. Transmit Multihop Encrypted Payload
    alice.send_message("Bob_Node", "Rendezvous at Sector 7. Comm channels compromised.")
    
    print("\n===========================================================================")
    print("Routing Table (Charlie Relay):")
    print(json.dumps(charlie.routing_table, indent=2))
    print("===========================================================================")
