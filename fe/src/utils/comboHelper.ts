/**
 * Helper utility to list constituent dishes inside the predefined combos.
 */
export const getComboConstituents = (name: string): string[] | null => {
  if (!name) return null;
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes("combo sung túc") || lowerName.includes("combo sung tuc")) {
    return [
      "Gỏi ngó sen tôm thịt",
      "Gà nướng xôi phồng",
      "Cá lóc kho tộ",
      "Canh chua cá lóc Nam Bộ",
      "Cơm niêu đất xá xíu"
    ];
  }
  if (lowerName.includes("combo thịnh soạn") || lowerName.includes("combo thinh soan")) {
    return [
      "Hàu nướng bơ tỏi",
      "Heo quay bánh hỏi",
      "Lẩu hải sản chua cay thập cẩm"
    ];
  }
  if (lowerName.includes("combo phố cổ") || lowerName.includes("combo pho co")) {
    return [
      "Cơm gà Hội An đặc sản",
      "Cao lầu thịt xá xíu",
      "Bánh vạc tai vạc cổ truyền"
    ];
  }
  return null;
};
