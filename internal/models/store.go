package models

import (
	"time"
)

type Store struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string    `gorm:"type:varchar(255);not null" json:"name"`
	Address   string    `gorm:"type:text" json:"address"`
	Timezone  string    `gorm:"type:varchar(50);default:'Asia/Jakarta';not null" json:"timezone"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
