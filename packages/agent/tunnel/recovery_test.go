package tunnel

import (
	"context"
	"crypto/ed25519"
	"log/slog"
	"os"
	"testing"

	"github.com/zoop-internet/zoop/packages/core/types"
)

func TestConnectionRecoveryManager(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	dev, err := NewDeviceManager("z-rec-test", nil)
	if err != nil {
		t.Skipf("skipping test due to TUN device creation failure (requires root/CAP_NET_ADMIN): %v", err)
	}
	defer dev.Close()

	key, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("failed to generate key pair: %v", err)
	}

	_ = dev.ConfigureDevice(key.PrivateKey, 0)
	port, _ := dev.GetListenPort()

	pub, _, _ := ed25519.GenerateKey(nil)
	_ = pub

	stateCh := make(chan ConnectionRecoveryState, 2)
	crm := NewConnectionRecoveryManager(
		dev.GetMuxBind(),
		key.PublicKey,
		[]types.EndpointCandidate{{IP: "127.0.0.1", Port: port, Type: types.CandidateTypeHost}},
		"conn-rec-test",
		port,
		dev,
		"ws://127.0.0.1:8080/relay",
		func(newState ConnectionRecoveryState, activeEndpoint string, isDirect bool) {
			stateCh <- newState
		},
		logger,
	)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	crm.Start(ctx)

	curState, _, isDirect := crm.GetState()
	if curState != StateDirect || !isDirect {
		t.Errorf("expected initial state Direct/true, got %s/%v", curState, isDirect)
	}

	// Update candidates
	crm.UpdateCandidates([]types.EndpointCandidate{
		{IP: "127.0.0.1", Port: port, Type: types.CandidateTypeHost, Priority: 100},
	})

	crm.Stop()
}
