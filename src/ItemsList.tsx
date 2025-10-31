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
    <div className="items-container">
      <div className="items-carousel">
        {items.map((item, index) => (
          <div 
            key={index} 
            className="item-badge"
            onClick={() => handleItemClick(item)}
            style={{ cursor: onItemClick ? 'pointer' : 'default' }}
          >
            <span className="item-name">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemsList;
