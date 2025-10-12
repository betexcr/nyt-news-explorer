import { useSearchStore } from '../searchStore';
import type { Article } from '../../types/nyt';

beforeEach(() => { 
  useSearchStore.getState().reset();
});

describe('searchStore', () => {
  test('sets and gets basic values', () => {
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

  test('sets and gets view mode', () => {
    useSearchStore.getState().setViewMode('table');
    expect(useSearchStore.getState().viewMode).toBe('table');
    
    useSearchStore.getState().setViewMode('grid');
    expect(useSearchStore.getState().viewMode).toBe('grid');
  });

  test('sets and gets loading state', () => {
    useSearchStore.getState().setLoading(true);
    expect(useSearchStore.getState().loading).toBe(true);
    
    useSearchStore.getState().setLoading(false);
    expect(useSearchStore.getState().loading).toBe(false);
  });

  test('sets and gets advanced params', () => {
    const advancedParams = {
      query: 'test query',
      sort: 'newest' as const,
      beginDate: '20240101',
      endDate: '20241231',
      section: 'Technology'
    };
    
    useSearchStore.getState().setAdvancedParams(advancedParams);
    expect(useSearchStore.getState().advancedParams).toEqual(advancedParams);
  });

  test('resets store to initial state', () => {
    // Set some values
    useSearchStore.getState().setQuery('test');
    useSearchStore.getState().setArticles([{ _id:'1', web_url:'u', snippet:'s', multimedia:{}, headline:{main:'h'}, pub_date:'', lead_paragraph:'', section_name:'W' } as any]);
    useSearchStore.getState().setHasSearched(true);
    useSearchStore.getState().setScrollY(100);
    useSearchStore.getState().setViewMode('table');
    useSearchStore.getState().setLoading(true);
    useSearchStore.getState().setAdvancedParams({ query: 'test', sort: 'newest' as const });

    // Reset
    useSearchStore.getState().reset();

    // Check initial state
    const state = useSearchStore.getState();
    expect(state.query).toBe('');
    expect(state.articles).toEqual([]);
    expect(state.hasSearched).toBe(false);
    expect(state.scrollY).toBe(0);
    expect(state.viewMode).toBe('grid');
    expect(state.loading).toBe(false);
    expect(state.advancedParams).toBeNull();
  });

  test('handles empty articles array', () => {
    useSearchStore.getState().setArticles([]);
    expect(useSearchStore.getState().articles).toEqual([]);
  });

  test('handles empty query', () => {
    useSearchStore.getState().setQuery('');
    expect(useSearchStore.getState().query).toBe('');
  });

  test('handles whitespace query', () => {
    useSearchStore.getState().setQuery('   ');
    expect(useSearchStore.getState().query).toBe('   ');
  });

  test('handles negative scroll position', () => {
    useSearchStore.getState().setScrollY(-100);
    expect(useSearchStore.getState().scrollY).toBe(-100);
  });

  test('handles zero scroll position', () => {
    useSearchStore.getState().setScrollY(0);
    expect(useSearchStore.getState().scrollY).toBe(0);
  });

  test('handles large scroll position', () => {
    useSearchStore.getState().setScrollY(10000);
    expect(useSearchStore.getState().scrollY).toBe(10000);
  });

  test('handles null advanced params', () => {
    useSearchStore.getState().setAdvancedParams(null);
    expect(useSearchStore.getState().advancedParams).toBeNull();
  });

  test('handles partial advanced params', () => {
    const partialParams = {
      query: 'test',
      sort: 'newest' as const
    };
    
    useSearchStore.getState().setAdvancedParams(partialParams);
    expect(useSearchStore.getState().advancedParams).toEqual(partialParams);
  });

  test('persists state across multiple calls', () => {
    const testArticle: Article = {
      _id: 'test',
      web_url: 'https://example.com',
      snippet: 'Test snippet',
      headline: { main: 'Test headline' },
      keywords: [],
      pub_date: '2024-01-01T00:00:00Z',
      multimedia: {}
    };

    useSearchStore.getState().setQuery('persistent query');
    useSearchStore.getState().setArticles([testArticle]);
    useSearchStore.getState().setHasSearched(true);
    useSearchStore.getState().setViewMode('table');
    useSearchStore.getState().setLoading(true);

    // Verify state persists
    const state = useSearchStore.getState();
    expect(state.query).toBe('persistent query');
    expect(state.articles).toEqual([testArticle]);
    expect(state.hasSearched).toBe(true);
    expect(state.viewMode).toBe('table');
    expect(state.loading).toBe(true);
  });

  test('handles multiple rapid state changes', () => {
    const store = useSearchStore.getState();
    
    // Rapid state changes
    store.setQuery('query1');
    store.setQuery('query2');
    store.setQuery('query3');
    store.setViewMode('grid');
    store.setViewMode('table');
    store.setViewMode('grid');
    store.setLoading(true);
    store.setLoading(false);
    store.setLoading(true);

    // Final state should be correct
    const finalState = useSearchStore.getState();
    expect(finalState.query).toBe('query3');
    expect(finalState.viewMode).toBe('grid');
    expect(finalState.loading).toBe(true);
  });

  test('initial state is correct', () => {
    useSearchStore.getState().reset();
    const state = useSearchStore.getState();
    
    expect(state.query).toBe('');
    expect(state.articles).toEqual([]);
    expect(state.hasSearched).toBe(false);
    expect(state.scrollY).toBe(0);
    expect(state.viewMode).toBe('grid');
    expect(state.loading).toBe(false);
    expect(state.advancedParams).toBeNull();
  });

  test('handles complex article objects', () => {
    const complexArticle: Article = {
      _id: 'complex',
      web_url: 'https://example.com/complex',
      snippet: 'Complex article snippet',
      headline: { main: 'Complex Headline' },
      keywords: [{ name: 'keyword1', value: 'value1', rank: 1 }, { name: 'keyword2', value: 'value2', rank: 2 }],
      pub_date: '2024-01-01T00:00:00Z',
      multimedia: {
        caption: 'Test caption',
        credit: 'Test credit',
        default: {
          url: 'https://example.com/image.jpg',
          height: 600,
          width: 800
        },
        thumbnail: {
          url: 'https://example.com/thumb.jpg',
          height: 75,
          width: 75
        }
      },
      section_name: 'Technology',
      byline: { original: 'By John Doe' },
      lead_paragraph: 'This is a lead paragraph'
    };

    useSearchStore.getState().setArticles([complexArticle]);
    const state = useSearchStore.getState();
    
    expect(state.articles).toHaveLength(1);
    expect(state.articles[0]).toEqual(complexArticle);
  });
});
