import React from 'react';

const UrlPreview = ({ url, title, description, image }) => {
  return (
    <div className="border rounded-md overflow-hidden max-w-xs bg-white/5 shadow-sm">
      <div className="flex gap-2 p-2 items-start">
        {image && (
          <img src={image} alt={title || 'URL preview'} className="w-20 h-20 object-cover rounded-md" />
        )}
        <div className="flex flex-col flex-1 gap-1">
          {title && <div className="font-bold text-sm truncate">{title}</div>}
          {description && <div className="text-xs text-gray-400 line-clamp-2">{description}</div>}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 break-all truncate">
            {url}
          </a>
        </div>
      </div>
    </div>
  );
};

export default UrlPreview;