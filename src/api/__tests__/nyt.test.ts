 
const OLD_ENV = process.env;

const makeAxios = (impl) => {
  const get = jest.fn(impl);
  const instance = { get };
  const create = jest.fn(() => instance);
  const axios = Object.assign(() => instance, { create, get });
  return { __esModule: true, default: axios };
};

beforeEach(() => {
  jest.resetModules();
  process.env = { ...OLD_ENV, REACT_APP_NYT_API_KEY: 'test-key' };
});

afterAll(() => {
  process.env = OLD_ENV;
});

test('searchArticles: early return when query is blank (no axios call)', async () => {
  const get = jest.fn();
  jest.doMock('axios', () => {
    const instance = { get };
    const create = jest.fn(() => instance);
    return { __esModule: true, default: Object.assign(() => instance, { create, get }) };
  });

  const api = await import('../nyt');
  const r1 = await (api as any).searchArticles('');
  const r2 = await (api as any).searchArticles('   ');
  expect(r1).toEqual([]);
  expect(r2).toEqual([]);
  expect(get).not.toHaveBeenCalled();
});

test('searchArticles: success, includes api-key and trimmed query', async () => {
  jest.doMock('axios', () =>
    makeAxios((_url: string, { params, signal }: any) => {
      expect(params['api-key']).toBe('test-key');
      expect(params.q).toBe('climate'); 
      expect(Number.isInteger(params.page) && params.page >= 0).toBe(true);
      expect(signal).toBeUndefined();  
      return Promise.resolve({
        data: { response: { docs: [{ _id: 'A' }] } },
      });
    })
  );
  const api = await import('../nyt');
  const res = await (api as any).searchArticles('  climate  ');
  expect(res).toEqual([{ _id: 'A' }]);
});

test('searchArticlesAdv: builds params (page default, sort, begin/end, section->fq with escaping)', async () => {
  const sectionWithQuotes = 'Opinions "and" Ideas';
  jest.doMock('axios', () =>
    makeAxios((_url: string, { params }: any) => {
 
      expect(params['api-key']).toBe('test-key')
      expect(params.page).toBe(0);
      expect(params.q).toBe('science');
      expect(params.sort).toBe('newest');
      expect(params.begin_date).toBe('20240101');
      expect(params.end_date).toBe('20241231'); 
      expect(params.fq).toBe('section_name:("Opinions \\"and\\" Ideas")');
      return Promise.resolve({
        data: { response: { docs: [{ _id: 'D1' }, { _id: 'D2' }] } },
      });
    })
  );

  const api = await import('../nyt');
  const res = await (api as any).searchArticlesAdv({
    q: 'science',
    sort: 'newest',
    begin: '20240101',
    end: '20241231',
    section: sectionWithQuotes,
  });
  expect(res.length).toBe(2);
});

test('searchArticlesAdv: no fq when section is blank/whitespace', async () => {
  jest.doMock('axios', () =>
    makeAxios((_url: string, { params }: any) => {
      expect(params.q).toBe('tech');
      expect(params.fq).toBeUndefined();
      return Promise.resolve({ data: { response: { docs: [] } } });
    })
  );

  const api = await import('../nyt');
  const res = await (api as any).searchArticlesAdv({ q: 'tech', section: '   ' });
  expect(res).toEqual([]);
});

test('getArticleByUrl: early return for blank URL (no axios call)', async () => {
  const get = jest.fn();
  jest.doMock('axios', () => {
    const instance = { get };
    const create = jest.fn(() => instance);
    return { __esModule: true, default: Object.assign(() => instance, { create, get }) };
  });

  const api = await import('../nyt');
  const r1 = await (api as any).getArticleByUrl('');
  const r2 = await (api as any).getArticleByUrl('   ');
  expect(r1).toBeNull();
  expect(r2).toBeNull();
  expect(get).not.toHaveBeenCalled();
});

test('getArticleByUrl: success returns first doc and escapes quotes in fq', async () => {
  const urlWithQuotes = 'https://example.com/a?x="y"';
  jest.doMock('axios', () =>
    makeAxios((_url: string, { params }: any) => {
      expect(params['api-key']).toBe('test-key'); 
      expect(params.fq).toBe('web_url:("https://example.com/a?x=\\"y\\"")'); 
      expect(params.page).toBe(0);
      return Promise.resolve({
        data: { response: { docs: [{ _id: 'FIRST' }, { _id: 'SECOND' }] } },
      });
    })
  );

  const api = await import('../nyt');
  const doc = await (api as any).getArticleByUrl(urlWithQuotes);
  expect(doc._id).toBe('FIRST');
});

test('getArticleByUrl: returns null when docs missing/empty', async () => {
  jest.doMock('axios', () => makeAxios(() => Promise.resolve({ data: { response: { docs: [] } } })));
  const api = await import('../nyt');
  const doc = await (api as any).getArticleByUrl('https://example.com/nothing');
  expect(doc).toBeNull();
});
