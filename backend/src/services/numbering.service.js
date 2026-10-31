export async function nextSequence(tx, key) {
  const sequence = await tx.numberSequence.upsert({
    where: { key },
    create: { key, currentValue: 1 },
    update: { currentValue: { increment: 1 } },
  });
  return sequence.currentValue;
}

export async function nextDocumentNumber(tx, type, date = new Date()) {
  const year = date.getUTCFullYear();
  const sequence = await nextSequence(tx, `${type.toLowerCase()}:${year}`);
  return `${type}-${year}-${String(sequence).padStart(5, '0')}`;
}
