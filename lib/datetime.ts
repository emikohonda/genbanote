// JSTのその日 [00:00, 翌日00:00)
export function jstDayRange(ymd: string) {
  // ymd: 'YYYY-MM-DD'
  const start = new Date(`${ymd}T00:00:00+09:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function formatJPDate(d: Date) {
  const w = ["日","月","火","水","木","金","土"][d.getDay()];
  return `${d.getMonth()+1}月${d.getDate()}日（${w}）`;
}
