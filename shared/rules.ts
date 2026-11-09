/**
 * Chuẩn hóa và bóc tách tiếng / chữ cái theo luật Hát Nối tiếng Việt.
 * 
 * Luật:
 * 1. Câu / từ gồm nhiều âm tiết (tiếng), ví dụ: "Mùa xuân" -> các tiếng: ["Mùa", "xuân"].
 * 2. Lấy TỪ CUỐI CÙNG (âm tiết cuối): "xuân".
 * 3. Lấy CHỮ CÁI ĐẦU TIÊN của từ cuối: chữ "x" (chuyển chữ thường, bỏ dấu nếu có trên phụ âm hoặc giữ chữ cái Latinh đầu: x -> X).
 * 4. Người tiếp theo phải bắt đầu bằng chữ cái đó.
 */

// Bảng ánh xạ các ký tự có dấu tiếng Việt về chữ cái gốc để so sánh chữ cái đầu
export function normalizeFirstLetter(char: string): string {
  if (!char) return '';
  const c = char.toLowerCase().normalize('NFD');
  // Ký tự đầu tiên sau khi normalize NFD (ví dụ: 'đ' hoặc các nguyên âm)
  const first = char.toLowerCase()[0];
  if (first === 'đ') return 'đ';
  // Lấy ký tự ASCII tương ứng nếu là nguyên âm có dấu: á -> a, ê -> e, v.v.
  const baseChar = c[0];
  return baseChar;
}

export function cleanPhrase(text: string): string {
  return text.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').replace(/\s+/g, ' ');
}

export function extractWords(text: string): string[] {
  const cleaned = cleanPhrase(text);
  if (!cleaned) return [];
  return cleaned.split(' ').filter(Boolean);
}

/**
 * Lấy chữ cái bắt buộc cho lượt tiếp theo dựa trên từ cuối cùng của câu vừa hát.
 * Ví dụ: "Mùa xuân" -> từ cuối "xuân" -> chữ "x"
 * "Quê hương" -> từ cuối "hương" -> chữ "h"
 */
export function getNextRequiredLetter(phrase: string): string {
  const words = extractWords(phrase);
  if (words.length === 0) return '';
  const lastWord = words[words.length - 1];
  return normalizeFirstLetter(lastWord);
}

/**
 * Lấy chữ cái đầu tiên của câu mà người chơi hát.
 * Ví dụ: "Xa quê" -> từ đầu "Xa" -> chữ "x"
 */
export function getFirstLetterOfPhrase(phrase: string): string {
  const words = extractWords(phrase);
  if (words.length === 0) return '';
  const firstWord = words[0];
  return normalizeFirstLetter(firstWord);
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  firstLetter?: string;
  nextLetter?: string;
}

export function validateTurn(
  phrase: string,
  targetLetter: string,
  usedPhrases: string[]
): ValidationResult {
  const cleaned = cleanPhrase(phrase).toLowerCase();
  if (!cleaned) {
    return { valid: false, error: 'Bạn chưa nhập câu hát!' };
  }

  // Kiểm tra trùng lặp
  const isDuplicated = usedPhrases.some(p => cleanPhrase(p).toLowerCase() === cleaned);
  if (isDuplicated) {
    return { valid: false, error: `Câu "${phrase}" đã được hát trước đó trong ván này!` };
  }

  // Nếu targetLetter được chỉ định (từ lượt 2 trở đi)
  const actualFirstLetter = getFirstLetterOfPhrase(phrase);
  if (targetLetter) {
    const expected = normalizeFirstLetter(targetLetter);
    if (actualFirstLetter !== expected) {
      return {
        valid: false,
        error: `Sai chữ cái đầu! Bạn phải bắt đầu bằng chữ "${expected.toUpperCase()}", nhưng câu của bạn bắt đầu bằng "${actualFirstLetter.toUpperCase()}".`
      };
    }
  }

  const nextLetter = getNextRequiredLetter(phrase);

  return {
    valid: true,
    firstLetter: actualFirstLetter,
    nextLetter: nextLetter
  };
}
