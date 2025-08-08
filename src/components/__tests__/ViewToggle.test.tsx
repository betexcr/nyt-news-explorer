import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ViewToggle from '../ViewToggle';
import type { ViewMode } from '../../store/searchStore';

describe('ViewToggle', () => {
  const mockOnViewChange = jest.fn();

  beforeEach(() => {
    mockOnViewChange.mockClear();
  });

  test('renders all toggle buttons', () => {
    render(<ViewToggle viewMode="grid" onViewChange={mockOnViewChange} />);
    
    expect(screen.getByLabelText('Grid view')).toBeInTheDocument();
    expect(screen.getByLabelText('List view')).toBeInTheDocument();
    expect(screen.getByLabelText('Table view')).toBeInTheDocument();
  });

  test('shows grid button as active when viewMode is grid', () => {
    render(<ViewToggle viewMode="grid" onViewChange={mockOnViewChange} />);
    
    const gridButton = screen.getByLabelText('Grid view');
    const tableButton = screen.getByLabelText('Table view');
    
    expect(gridButton).toHaveClass('active');
    expect(tableButton).not.toHaveClass('active');
  });

  test('shows table button as active when viewMode is table', () => {
    render(<ViewToggle viewMode="table" onViewChange={mockOnViewChange} />);
    
    const gridButton = screen.getByLabelText('Grid view');
    const tableButton = screen.getByLabelText('Table view');
    
    expect(tableButton).toHaveClass('active');
    expect(gridButton).not.toHaveClass('active');
  });

  test('shows list button as active when viewMode is list', () => {
    render(<ViewToggle viewMode="list" onViewChange={mockOnViewChange} />);
    
    const listButton = screen.getByLabelText('List view');
    const gridButton = screen.getByLabelText('Grid view');
    const tableButton = screen.getByLabelText('Table view');
    
    expect(listButton).toHaveClass('active');
    expect(gridButton).not.toHaveClass('active');
    expect(tableButton).not.toHaveClass('active');
  });

  test('calls onViewChange with grid when grid button is clicked', () => {
    render(<ViewToggle viewMode="table" onViewChange={mockOnViewChange} />);
    
    const gridButton = screen.getByLabelText('Grid view');
    fireEvent.click(gridButton);
    
    expect(mockOnViewChange).toHaveBeenCalledWith('grid');
  });

  test('calls onViewChange with table when table button is clicked', () => {
    render(<ViewToggle viewMode="grid" onViewChange={mockOnViewChange} />);
    
    const tableButton = screen.getByLabelText('Table view');
    fireEvent.click(tableButton);
    
    expect(mockOnViewChange).toHaveBeenCalledWith('table');
  });

  test('calls onViewChange with list when list button is clicked', () => {
    render(<ViewToggle viewMode="grid" onViewChange={mockOnViewChange} />);
    
    const listButton = screen.getByLabelText('List view');
    fireEvent.click(listButton);
    
    expect(mockOnViewChange).toHaveBeenCalledWith('list');
  });

  test('has correct title attributes', () => {
    render(<ViewToggle viewMode="grid" onViewChange={mockOnViewChange} />);
    
    expect(screen.getByTitle('Grid view')).toBeInTheDocument();
    expect(screen.getByTitle('Table view')).toBeInTheDocument();
  });

  test('renders SVG icons', () => {
    const { container } = render(<ViewToggle viewMode="grid" onViewChange={mockOnViewChange} />);
    
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(3);
  });

  test('buttons have correct CSS classes', () => {
    render(<ViewToggle viewMode="grid" onViewChange={mockOnViewChange} />);
    
    const gridButton = screen.getByLabelText('Grid view');
    const tableButton = screen.getByLabelText('Table view');
    
    expect(gridButton).toHaveClass('button', 'active');
    expect(tableButton).toHaveClass('button');
    expect(tableButton).not.toHaveClass('active');
  });

  test('container has correct CSS class', () => {
    const { container } = render(<ViewToggle viewMode="grid" onViewChange={mockOnViewChange} />);
    
    expect(container.firstChild).toHaveClass('view-toggle');
  });

  test('toggle buttons container has correct CSS class', () => {
    const { container } = render(<ViewToggle viewMode="grid" onViewChange={mockOnViewChange} />);
    
    const toggleButtons = container.querySelector('.toggle-buttons');
    expect(toggleButtons).toBeInTheDocument();
  });
}); 