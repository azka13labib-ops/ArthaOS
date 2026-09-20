package services

import (
	"log"
)

type NLPService interface {
	ParseMessage(message string) (intent string, entities map[string]interface{}, err error)
}

type nlpService struct{}

func NewNLPService() NLPService {
	return &nlpService{}
}

func (s *nlpService) ParseMessage(message string) (string, map[string]interface{}, error) {

	log.Printf("Parsing message with NLP: %s", message)

	return "unknown", nil, nil
}
