// Indian Sign Language (ISL) Verified Vocabulary Dataset (150+ signs)
import islVocabulary from '../../backend/data/isl_vocabulary.json';

export interface ISLSignItem {
  english: string;
  telugu: string;
  gloss: string;
  category: string;
  handshape?: string;
  movement?: string;
}

export const ISL_VOCABULARY: Record<string, ISLSignItem> = islVocabulary as Record<string, ISLSignItem>;

export const VOCABULARY_LIST = Object.values(ISL_VOCABULARY);

export const CATEGORIES = Array.from(new Set(VOCABULARY_LIST.map(item => item.category)));
