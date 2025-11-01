import React from 'react';

import './ItemsList.css';

interface ItemsListProps {
  items: string[];
  onItemClick?: (item: string) => void;
}

const ItemsList: React.FC<ItemsListProps> = ({ items, onItemClick }) => {
  const handleItemClick = (item: string) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  return (
    <div className="items-list">
      <div className="items-list__carousel">
        {items.map((item, index) => (
          <div 
            key={index} 
            className={`items-list__item ${onItemClick ? 'items-list__item--clickable' : ''}`}
            onClick={() => handleItemClick(item)}
          >
            <span className="items-list__item-name">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemsList;
