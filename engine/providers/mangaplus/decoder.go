package mangaplus

import (
	"encoding/binary"
	"encoding/hex"
)

// XORDecrypt applies in-place XOR byte decryption to image bytes if keyHex is present.
func XORDecrypt(data []byte, keyHex string) []byte {
	if keyHex == "" || len(data) == 0 {
		return data
	}

	// Optimized path for standard 32-char hex (16-byte key) without heap allocation
	if len(keyHex) == 32 {
		var keyBytes [16]byte
		if _, err := hex.Decode(keyBytes[:], []byte(keyHex)); err == nil {
			k0 := binary.LittleEndian.Uint64(keyBytes[0:8])
			k1 := binary.LittleEndian.Uint64(keyBytes[8:16])

			n := len(data)
			i := 0
			// Decrypt 16 bytes per iteration (2x 64-bit word operations)
			for ; i+16 <= n; i += 16 {
				w0 := binary.LittleEndian.Uint64(data[i : i+8])
				w1 := binary.LittleEndian.Uint64(data[i+8 : i+16])
				binary.LittleEndian.PutUint64(data[i:i+8], w0^k0)
				binary.LittleEndian.PutUint64(data[i+8:i+16], w1^k1)
			}
			// Process remaining tail bytes
			for ; i < n; i++ {
				data[i] ^= keyBytes[i&15]
			}
			return data
		}
	}

	// Generic fallback for non-standard key lengths
	keyBytes, err := hex.DecodeString(keyHex)
	if err != nil || len(keyBytes) == 0 {
		return data
	}
	keyLen := len(keyBytes)
	for i := 0; i < len(data); i++ {
		data[i] ^= keyBytes[i%keyLen]
	}
	return data
}
