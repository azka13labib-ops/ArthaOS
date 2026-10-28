package worker

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestWorkerPoolExecution(t *testing.T) {
	pool := NewPool(2, 10)
	defer pool.Shutdown()

	var counter int64
	done := make(chan struct{})

	for i := 0; i < 5; i++ {
		submitted := pool.Submit(func(ctx context.Context) error {
			val := atomic.AddInt64(&counter, 1)
			if val == 5 {
				close(done)
			}
			return nil
		})
		if !submitted {
			t.Fatalf("failed to submit job %d", i)
		}
	}

	select {
	case <-done:
		if counter != 5 {
			t.Errorf("expected counter 5, got %d", counter)
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("timeout waiting for jobs to finish")
	}
}

func TestWorkerPoolPanicRecovery(t *testing.T) {
	pool := NewPool(1, 5)
	defer pool.Shutdown()

	var executed int64
	done := make(chan struct{})

	// 1. Submit a job that panics
	pool.Submit(func(ctx context.Context) error {
		panic("deliberate worker panic test")
	})

	// 2. Submit a normal job immediately after; worker must survive panic
	pool.Submit(func(ctx context.Context) error {
		atomic.StoreInt64(&executed, 1)
		close(done)
		return nil
	})

	select {
	case <-done:
		if atomic.LoadInt64(&executed) != 1 {
			t.Errorf("worker did not recover to execute next job")
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("worker died from panic and failed to run subsequent job")
	}
}

func TestSchedulerEveryAndStop(t *testing.T) {
	scheduler := NewScheduler()

	var runs int64
	scheduler.Every(20*time.Millisecond, func() {
		atomic.AddInt64(&runs, 1)
	})

	time.Sleep(75 * time.Millisecond)
	scheduler.Stop()

	countBefore := atomic.LoadInt64(&runs)
	if countBefore < 2 {
		t.Errorf("expected scheduler to run at least 2 times, got %d", countBefore)
	}

	// Sleep further to verify scheduler actually stopped
	time.Sleep(50 * time.Millisecond)
	countAfter := atomic.LoadInt64(&runs)
	if countAfter != countBefore {
		t.Errorf("scheduler kept running after Stop(): before=%d, after=%d", countBefore, countAfter)
	}
}
