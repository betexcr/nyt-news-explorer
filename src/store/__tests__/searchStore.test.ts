import { useSearchStore } from '../searchStore';

beforeEach(() => { 
  useSearchStore.getState().reset();
});

test('sets and gets values', () => {
  useSearchStore.getState().setQuery('q1');
  useSearchStore.getState().setArticles([{ _id:'1', web_url:'u', snippet:'s', multimedia:{}, headline:{main:'h'}, pub_date:'', lead_paragraph:'', section_name:'W' } as any]);
  useSearchStore.getState().setHasSearched(true);
  useSearchStore.getState().setScrollY(123);
  const s = useSearchStore.getState();
  expect(s.query).toBe('q1');
  expect(s.articles.length).toBe(1);
  expect(s.hasSearched).toBe(true);
  expect(s.scrollY).toBe(123);
});
