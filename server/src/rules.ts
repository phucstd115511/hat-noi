export function normalizeFirstLetter(char: string): string {
  if (!char) return '';
  const c = char.toLowerCase().normalize('NFD');
  const first = char.toLowerCase()[0];
  if (first === 'đ') return 'đ';
  return c[0];
}

export function cleanPhrase(text: string): string {
  return text.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').replace(/\s+/g, ' ');
}

export function extractWords(text: string): string[] {
  const cleaned = cleanPhrase(text);
  if (!cleaned) return [];
  return cleaned.split(' ').filter(Boolean);
}

export function getNextRequiredLetter(phrase: string): string {
  const words = extractWords(phrase);
  if (words.length === 0) return '';
  const lastWord = words[words.length - 1];
  return normalizeFirstLetter(lastWord);
}

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

  const isDuplicated = usedPhrases.some(p => cleanPhrase(p).toLowerCase() === cleaned);
  if (isDuplicated) {
    return { valid: false, error: `Câu "${phrase}" đã được dùng trước đó trong ván này!` };
  }

  const actualFirstLetter = getFirstLetterOfPhrase(phrase);
  if (targetLetter) {
    const expected = normalizeFirstLetter(targetLetter);
    if (actualFirstLetter !== expected) {
      return {
        valid: false,
        error: `Sai chữ cái đầu! Cần bắt đầu bằng chữ "${expected.toUpperCase()}", nhưng bạn hát chữ "${actualFirstLetter.toUpperCase()}".`
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
