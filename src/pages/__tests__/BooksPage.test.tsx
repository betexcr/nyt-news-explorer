import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import * as gql from '../../api/graphql-client';
import BooksPage from '../BooksPage';

describe('BooksPage', () => {
  test('renders best sellers grid', async () => {
    const spy = jest.spyOn(gql, 'fetchBestsellers').mockResolvedValueOnce([
      {
        rank: 1,
        rank_last_week: 0,
        weeks_on_list: 2,
        asterisk: 0,
        dagger: 0,
        primary_isbn10: '0000000000',
        primary_isbn13: '9780000000000',
        publisher: 'Test Pub',
        description: 'Test desc',
        price: '0.00',
        title: 'Test Book',
        author: 'Test Author',
        contributor: 'by Test Author',
        contributor_note: '',
        book_image: '',
        book_image_width: 0,
        book_image_height: 0,
        amazon_product_url: '',
        age_group: '',
        book_review_link: '',
        first_chapter_link: '',
        sunday_review_link: '',
        article_chapter_link: '',
        isbns: [],
        buy_links: [],
        book_uri: 'nyt://book/test'
      }
    ] as any);

    try {
      render(
        <MemoryRouter>
          <BooksPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Books')).toBeInTheDocument();
        expect(screen.getByText('Test Book')).toBeInTheDocument();
      });
    } finally {
      spy.mockRestore();
    }
  });
});


