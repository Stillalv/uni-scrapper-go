package mangaplus

import (
	"bytes"
	"encoding/hex"
	"testing"
)

func TestXORDecrypt_Accuracy(t *testing.T) {
	keyHex := "0123456789abcdef0123456789abcdef"
	keyBytes, err := hex.DecodeString(keyHex)
	if err != nil {
		t.Fatalf("Failed to decode key: %v", err)
	}

	testSizes := []int{0, 1, 15, 16, 17, 31, 32, 64, 100, 1024, 1024*1024 + 7}

	for _, size := range testSizes {
		original := make([]byte, size)
		for i := 0; i < size; i++ {
			original[i] = byte((i * 37) % 256)
		}

		// Expected output using scalar XOR
		expected := make([]byte, size)
		for i := 0; i < size; i++ {
			expected[i] = original[i] ^ keyBytes[i&15]
		}

		input := make([]byte, size)
		copy(input, original)

		result := XORDecrypt(input, keyHex)

		if !bytes.Equal(result, expected) {
			t.Fatalf("Size %d mismatch: got != expected", size)
		}

		// Invert (XOR twice should return original)
		restored := XORDecrypt(result, keyHex)
		if !bytes.Equal(restored, original) {
			t.Fatalf("Size %d roundtrip mismatch", size)
		}
	}
}

func BenchmarkXORDecrypt_1MB(b *testing.B) {
	keyHex := "a2a9960bd0060a6eba81ebb25ad5b13c"
	data := make([]byte, 1024*1024)
	for i := range data {
		data[i] = byte(i)
	}

	b.SetBytes(int64(len(data)))
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		_ = XORDecrypt(data, keyHex)
	}
}
