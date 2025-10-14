import React from 'react';

import './ItemsList.css';

interface ItemsListProps {
  items: string[];
  title?: string;
}

const ItemsList: React.FC<ItemsListProps> = ({ items, title }) => {
  return (
    <div className="items-container">
      {title && <h4 className="items-title">{title}</h4>}
      <div className="items-carousel">
        {items.map((item, index) => (
          <div key={index} className="item-badge">
            <span className="item-name">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemsList;
