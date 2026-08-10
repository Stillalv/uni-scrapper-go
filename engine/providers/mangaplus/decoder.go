package mangaplus

import "encoding/hex"

// XORDecrypt applies in-place XOR byte decryption to image bytes if keyHex is present.
func XORDecrypt(data []byte, keyHex string) []byte {
	if keyHex == "" {
		return data
	}
	keyBytes, err := hex.DecodeString(keyHex)
	if err != nil || len(keyBytes) == 0 {
		return data
	}
	keyLen := len(keyBytes)
	if keyLen == 16 {
		for i := 0; i < len(data); i++ {
			data[i] ^= keyBytes[i&15]
		}
	} else {
		for i := 0; i < len(data); i++ {
			data[i] ^= keyBytes[i%keyLen]
		}
	}
	return data
}
