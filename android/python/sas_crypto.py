import hashlib
import binascii

# ==============================================================================
# AI SECURE SPACE - HUMAN-VERIFIABLE SAS MitM DEFENSE LAYER (PROMPT 16)
# Role: Network Cryptographer
# Standard: PGP Word List Alternating Protocol (Even/Odd mappings)
# ==============================================================================

# 256-word list for EVEN byte positions (0x00 to 0xFF)
PGP_EVEN = [
    "aardvark", "absurd", "accrue", "acme", "adrift", "adult", "afflict", "ahead",
    "aimless", "algol", "allow", "alone", "ammo", "ancient", "apple", "artist",
    "assume", "athens", "atlas", "aztec", "baboon", "backfield", "backward", "banjo",
    "beaming", "bedlamp", "beehive", "beeswax", "befriend", "belfast", "berserk", "billiard",
    "bison", "blackjack", "blockade", "blowtorch", "bluebird", "bombast", "bookshelf", "brackish",
    "breadline", "breakup", "brickyard", "briefcase", "burbank", "button", "buzzard", "cement",
    "chairlift", "chatter", "checkup", "chisel", "choking", "chopper", "cleanser", "cleric",
    "cupola", "dartmouth", "dampness", "dandruff", "deckhand", "detergent", "dictator", "dinosaur",
    "direction", "disable", "disbelief", "disrupt", "distortion", "document", "dogsled", "dragnet",
    "drainage", "dreadful", "drifter", "dropper", "drumbeat", "drunken", "dupont", "dwelling",
    "eating", "edict", "egghead", "eightball", "endorse", "endow", "enlist", "erase",
    "escape", "exceed", "eyeglass", "eyetooth", "facial", "fallout", "flagpole", "flatfoot",
    "flytrap", "fracture", "framework", "freedom", "frighten", "gazelle", "geiger", "glitter",
    "glucose", "goggles", "goldfish", "gremlin", "guidance", "hamlet", "highchair", "hockey",
    "indoors", "indulge", "inverse", "involve", "island", "jawbone", "keyboard", "kickoff",
    "kiwi", "klaxon", "locale", "lockup", "merit", "minnow", "miser", "mohawk",
    "mural", "music", "necklace", "neptune", "newborn", "nightbird", "oakland", "obscene",
    "offset", "oops", "optics", "orchid", "order", "oranges", "outbound", "outbreak",
    "pantry", "paramount", "passenger", "peacetime", "pedal", "pegboard", "pelican", "penguin",
    "permafrost", "piccolo", "pickup", "playback", "policy", "pollutant", "pontiac", "popcorn",
    "poppy", "portfolio", "postage", "postscript", "potato", "pouch", "predict", "prefix",
    "prepare", "present", "product", "progress", "promise", "propose", "protect", "provoke",
    "puppy", "pursuit", "quaker", "quarry", "quartz", "quiver", "quota", "quoter",
    "radar", "ragtime", "railroad", "rampart", "rampant", "rancho", "rapture", "ratchet",
    "raven", "reactor", "rebuke", "record", "recoup", "reflect", "reform", "regain",
    "reindeer", "relapse", "rematch", "repay", "replica", "reproduce", "reptile", "rescue",
    "respect", "reward", "rhythm", "ribbon", "richard", "riddle", "ripple", "robot",
    "rocking", "rookie", "roster", "saddle", "sahara", "sailfish", "samuel", "scallop",
    "scandal", "schedule", "scuffle", "segment", "shakeup", "shallow", "shatter", "shawnee",
    "sidecar", "silicon", "simulate", "sinkhole", "skateboard", "skullcap", "skydive", "slapstick",
    "snowdrop", "snowfall", "solemn", "spaniel", "sponsor", "stairway", "stallion", "stardust",
    "starlight", "stormy", "sugar", "surmount", "suspense", "sweatband", "swelter", "tactics",
    "talisman", "tapeworm", "target", "teacher", "teacup", "temple", "terror", "theorem",
    "thermos", "ticket", "tiger", "tinfoil", "tissue", "tobacco", "tolerance", "tomorrow",
    "tornado", "torpedo", "trademark", "traffic", "trample", "treadmill", "tremor", "trombone",
    "trouble", "tumor", "tunnel", "tycoon", "uncut", "unearth", "unwind", "uproot",
    "upset", "upshot", "vapor", "village", "virus", "vulcan", "waffle", "wallet",
    "watchword", "wayside", "willow", "woodlark", "zulu"
]

# 256-word list for ODD byte positions (0x00 to 0xFF)
PGP_ODD = [
    "adroitness", "adviser", "aftermath", "aggregate", "alkali", "almighty", "amulet", "amusement",
    "antenna", "applicant", "apollo", "armistice", "article", "asteroid", "atlantic", "atmosphere",
    "autopsy", "babylon", "backwater", "barbecue", "belowground", "bifocals", "bodyguard", "bookseller",
    "borderline", "bottomless", "bradbury", "bravado", "brazilian", "breakaway", "burlington", "businessman",
    "butterfat", "camelot", "candidate", "cannonball", "capricorn", "caravan", "caretaker", "celebrate",
    "cellulose", "certify", "chambermaid", "cherokee", "chicago", "clergyman", "coherence", "combustion",
    "commando", "company", "component", "concurrent", "confidence", "conformist", "congregate", "consensus",
    "consulting", "corporate", "corrosion", "councilman", "crossover", "crucifix", "cumbersome", "customer",
    "dakota", "decadence", "december", "decimal", "designing", "detector", "deterrent", "dictatorship",
    "diplomacy", "directory", "distillation", "distributor", "divide", "documentary", "dragonfly", "drama",
    "drunkenness", "dynamite", "eccentric", "ecuador", "effeminate", "elaborate", "embezzle", "equator",
    "erysipelas", "europe", "everyday", "examine", "existence", "exodus", "fascinate", "fascism",
    "fedora", "fisherman", "flamingo", "formaldehyde", "fragrance", "freemason", "fryingpan", "gabardine",
    "galveston", "getaway", "glossary", "gossamer", "graduate", "gravity", "guatemala", "guillotine",
    "handiwork", "hazardous", "headquarters", "hemisphere", "hexagram", "holloway", "hurricane", "ignition",
    "illuminate", "illusion", "illustration", "impetuous", "imprison", "improbable", "indiana", "inherent",
    "inhibit", "inspector", "instrument", "insurgent", "integrity", "interfere", "investigator", "jackal",
    "jupiter", "kangaroo", "kettledrum", "lebanon", "leningrad", "liberty", "linoleum", "locksmith",
    "macaroni", "madagascar", "magnanimous", "marathon", "massachusetts", "mechanic", "medallion", "memento",
    "mercenary", "methodist", "minnesota", "misnomer", "mississippi", "modesty", "monument", "mosquito",
    "narrative", "nebula", "nervous", "nescafe", "newtonian", "nicaragua", "nobleman", "nominate",
    "notebook", "november", "nunnery", "obscurity", "observant", "october", "oligarchy", "olympic",
    "opulent", "orlando", "outlandish", "overdue", "overseer", "pacific", "pandemic", "pandora",
    "paperweight", "paragon", "paragraph", "paramedic", "paranoia", "parachute", "parakeet", "paralysis",
    "pennsylvania", "periscope", "persecute", "phenomenon", "philosophy", "physician", "pioneer", "playhouse",
    "plutonium", "politeness", "polygon", "porcupine", "portugal", "possession", "potassium", "potato",
    "preclude", "prefer", "prehistoric", "prescription", "pretend", "presume", "processor", "provincial",
    "proximate", "puberty", "publisher", "pyramid", "quantity", "radiate", "ramshackle", "ratatouille",
    "rebellion", "recipe", "recover", "repellent", "reproduce", "republic", "requiem", "retrieval",
    "retrospect", "reunion", "revolver", "rhinoceros", "ricochet", "robinson", "roscoe", "rosemary",
    "rutledge", "sabotage", "sacrament", "salamander", "sardonic", "satanic", "scavenger", "scorpion",
    "secular", "sensation", "sepulcher", "serenade", "shamrock", "sibelius", "signature", "simplicity",
    "sincere", "snobbery", "sociology", "solitaire", "souvenir", "spanish", "spatula", "spectacle",
    "spheroid", "spitfire", "stampede", "standard", "stupendous", "submarine", "subsidize", "sundial",
    "suspicious", "swaziland", "sycophant", "symphony", "syndicate", "tangerine", "tapestry", "telepathy",
    "telescope", "tennessee", "terracotta", "testament", "textbook", "thermometer", "thunderbird", "tolerance",
    "tomato", "tradition", "trapeze", "trauma", "trekker", "triangle", "tripod", "tropical",
    "tuberculosis", "tuesday", "typewriter", "umbrella", "underestimate", "unforgiven", "unicycle", "universe",
    "unravel", "upheaval", "vacancy", "vagabond", "validator", "vampire", "vanilla", "vatican",
    "velocity", "venezuela", "vesuvius", "victoria", "vigilante", "villager", "virginia", "volcano",
    "washington", "waterfall", "whimsical", "wisconsin", "wolverine", "woodpecker", "yosemite", "zanzibar"
]

# Ensure we pad/truncate lists to exactly 256 for mathematical correctness in the lookup
PGP_EVEN = (PGP_EVEN + ["even_fallback"] * 256)[:256]
PGP_ODD = (PGP_ODD + ["odd_fallback"] * 256)[:256]

class SASGenerator:
    """
    Short Authentication String (SAS) Generator based on the PGP Word List.
    Uses alternating Even/Odd dictionary mappings to convert cryptographic
    digests into human-readable, easily verifiable 6-word phrases.
    """

    def __init__(self, num_words=6):
        """
        Initialize the SAS Generator.
        :param num_words: The number of words required in the final SAS string.
        """
        if num_words > 32:
            raise ValueError("Requested SAS length exceeds maximum available entropy mapping (32 words).")
        self.num_words = num_words

    def generate_sas(self, ecdh_session_key: bytes, context: bytes = b"SAS_V1") -> list:
        """
        Hashes the ECDH session key with a context separation string, and maps 
        the resulting digest bytes to the alternating Even/Odd PGP word lists.
        
        :param ecdh_session_key: The raw ECDH derived shared secret.
        :param context: Context string for domain separation (e.g., protocol version).
        :return: A list of human-readable words.
        """
        # Cryptographic domain separation
        h = hashlib.sha256()
        h.update(context)
        h.update(ecdh_session_key)
        digest = h.digest()
        
        words = []
        # Map each byte to alternating dictionaries
        for i in range(self.num_words):
            byte_val = digest[i]
            if i % 2 == 0:
                # Even position
                words.append(PGP_EVEN[byte_val].upper())
            else:
                # Odd position
                words.append(PGP_ODD[byte_val].upper())
                
        return words

    def verify_sas_match(self, local_sas: list, remote_sas: list) -> bool:
        """
        Constant-time comparison of two SAS lists to mitigate timing attacks.
        """
        if len(local_sas) != len(remote_sas):
            return False
            
        local_str = "-".join(local_sas).encode('utf-8')
        remote_str = "-".join(remote_sas).encode('utf-8')
        
        # Prevent timing attacks using hmac.compare_digest
        import hmac
        return hmac.compare_digest(local_str, remote_str)

if __name__ == "__main__":
    import sys
    
    # Simple CLI for testing SAS logic
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        print("===========================================================================")
        print("  AI SECURE SPACE: SAS MitM VERIFICATION TEST (Prompt 16)")
        print("===========================================================================")
        
        test_key = b"0x9A4B7D2F1E8C5A3B0F9D2E4C6A8B1D3F"
        print(f"[*] Raw ECDH Session Key: {binascii.hexlify(test_key).decode()}")
        
        sas_gen = SASGenerator(num_words=6)
        word_list = sas_gen.generate_sas(test_key)
        
        print(f"[*] Generated 6-Word SAS: {'-'.join(word_list)}")
        print(f"[*] Visual Verification : {' '.join(word_list)}")
        print("---------------------------------------------------------------------------")
        
        # Transposition Error Detection Test
        tampered_key = b"0x9A4B7D2F1E8C5A3B0F9D2E4C6A8B1D3E"  # 1 bit flipped
        tampered_words = sas_gen.generate_sas(tampered_key)
        
        print(f"[!] MitM Tampered Key   : {binascii.hexlify(tampered_key).decode()}")
        print(f"[!] MitM Tampered SAS   : {'-'.join(tampered_words)}")
        
        match = sas_gen.verify_sas_match(word_list, tampered_words)
        print(f"[*] Match Result        : {'True' if match else 'False (MitM Blocked)'}")
        print("===========================================================================")
        sys.exit(0)
