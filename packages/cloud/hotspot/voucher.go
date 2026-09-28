package hotspot

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"

	"github.com/zoop-internet/zoopspot/packages/core/types"
)

// GenerateRandomCode generates an 8-character uppercase voucher code formatted as ZP-XXXX-XXXX.
func GenerateRandomCode() (string, error) {
	const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ" // Excludes confusing characters 0, 1, I, O
	var p1, p2 strings.Builder

	for i := 0; i < 4; i++ {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		p1.WriteByte(charset[idx.Int64()])
	}

	for i := 0; i < 4; i++ {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		p2.WriteByte(charset[idx.Int64()])
	}

	return fmt.Sprintf("ZP-%s-%s", p1.String(), p2.String()), nil
}

// GenerateVoucherBatch creates a specified count of new vouchers for a given hotspot package.
func GenerateVoucherBatch(hotspotID, packageID types.ID, count int, batchTag string) ([]*types.HotspotVoucher, error) {
	if count <= 0 {
		return nil, fmt.Errorf("count must be greater than zero")
	}
	if count > 500 {
		return nil, fmt.Errorf("maximum batch size is 500 vouchers")
	}
	if batchTag == "" {
		batchTag = "general"
	}

	vouchers := make([]*types.HotspotVoucher, 0, count)
	for i := 0; i < count; i++ {
		code, err := GenerateRandomCode()
		if err != nil {
			return nil, fmt.Errorf("failed to generate random voucher code: %w", err)
		}
		v := &types.HotspotVoucher{
			ID:        types.NewID(),
			HotspotID: hotspotID,
			PackageID: packageID,
			Code:      code,
			BatchTag:  batchTag,
			IsClaimed: false,
		}
		vouchers = append(vouchers, v)
	}
	return vouchers, nil
}
