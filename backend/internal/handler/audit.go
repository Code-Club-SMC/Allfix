package handler

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"

	"github.com/AbdulRehman-z/allfix/internal/middleware"
	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

func auditLog(ctx context.Context, q *db.Queries, action, entityType string, entityID uuid.UUID, details map[string]any) {
	actorID, _ := middleware.UserIDFromContext(ctx)
	var detailsJSON []byte
	if len(details) > 0 {
		detailsJSON, _ = json.Marshal(details)
	}
	_, _ = q.CreateAuditLog(ctx, db.CreateAuditLogParams{
		Action:     action,
		ActorID:    uuidToPgtype(&actorID),
		EntityType: entityType,
		EntityID:   uuidToPgtype(&entityID),
		Details:    detailsJSON,
	})
}
