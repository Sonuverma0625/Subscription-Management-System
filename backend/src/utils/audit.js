export async function writeAuditLog(tx, { userId, action, entity, entityId, details }) {
  return tx.auditLog.create({
    data: { userId, action, entity, entityId, ...(details ? { details } : {}) },
  });
}
