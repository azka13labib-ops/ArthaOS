package worker

import (
	"context"
	"log"
	"sync"
	"time"
)

type Job func(context.Context) error

type Pool struct {
	jobs chan Job
	wg   sync.WaitGroup
}

func NewPool(size, queueSize int) *Pool {
	if size < 1 {
		size = 1
	}
	if queueSize < size {
		queueSize = size
	}
	p := &Pool{jobs: make(chan Job, queueSize)}
	for i := 0; i < size; i++ {
		p.wg.Add(1)
		go p.run()
	}
	return p
}

func (p *Pool) run() {
	defer p.wg.Done()
	for job := range p.jobs {
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[WORKER PANIC] background job recovered: %v", r)
				}
			}()
			if err := job(context.Background()); err != nil {
				log.Printf("[WORKER ERROR] background job failed: %v", err)
			}
		}()
	}
}

func (p *Pool) Submit(job Job) bool {
	select {
	case p.jobs <- job:
		return true
	default:
		return false
	}
}

func (p *Pool) Shutdown() {
	close(p.jobs)
	p.wg.Wait()
}

// Scheduler handles recurrent background tasks (e.g. daily backups) without external dependencies.
type Scheduler struct {
	stop chan struct{}
	wg   sync.WaitGroup
}

func NewScheduler() *Scheduler {
	return &Scheduler{stop: make(chan struct{})}
}

func (s *Scheduler) Every(interval time.Duration, task func()) {
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				task()
			case <-s.stop:
				return
			}
		}
	}()
}

func (s *Scheduler) Stop() {
	close(s.stop)
	s.wg.Wait()
}
