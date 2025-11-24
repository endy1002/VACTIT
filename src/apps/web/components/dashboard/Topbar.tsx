import React from 'react';

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar__search">
        <input
          type="text"
          placeholder="Tìm kiếm từ khóa/chức năng"
          className="topbar__search-input"
        />
        <button className="topbar__search-button">
          <img
            src="/assets/logos/search.png"
            alt="Search"
            width={18}
            height={18}
          />
        </button>
      </div>
      <div className="topbar__profile">
        <div className="topbar__avatar">
          <img
            src="/assets/logos/avatar.png"
            alt="User"
            width={36}
            height={36}
            className="rounded-full"
          />
        </div>
        <div className="topbar__profile-info">
          <span className="topbar__profile-name">Quang Thanh</span>
          <span className="topbar__profile-id">ID: 012345</span>
        </div>
      </div>
    </header>
  );
}