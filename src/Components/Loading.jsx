import React from 'react';
import './Loading.css';

const Loading = ({ type = 'spinner', count = 3 }) => {
  if (type === 'cards') {
    return (
      <div className="row g-3">
        {Array.from({ length: count }).map((_, i) => (
          <div className="col-12 col-md-6 col-lg-4" key={i}>
            <div className="card h-100 border-0 shadow-sm" aria-hidden="true">
              <div className="card-body">
                <h5 className="card-title placeholder-glow">
                  <span className="placeholder col-6"></span>
                </h5>
                <p className="card-text placeholder-glow">
                  <span className="placeholder col-7"></span>
                  <span className="placeholder col-4"></span>
                  <span className="placeholder col-4"></span>
                  <span className="placeholder col-6"></span>
                  <span className="placeholder col-8"></span>
                </p>
                <div className="placeholder-glow">
                   <a href="#" tabIndex="-1" className="btn btn-secondary disabled placeholder col-4 rounded-pill"></a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="list-group shadow-sm">
        {Array.from({ length: count }).map((_, i) => (
          <div className="list-group-item p-3 border-0 border-bottom" key={i} aria-hidden="true">
            <div className="d-flex w-100 justify-content-between mb-2 placeholder-glow">
              <span className="placeholder col-4"></span>
              <span className="placeholder col-2"></span>
            </div>
            <p className="mb-1 placeholder-glow">
              <span className="placeholder col-8"></span>
            </p>
            <small className="placeholder-glow">
              <span className="placeholder col-5"></span>
            </small>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr className="placeholder-glow">
              <th><span className="placeholder col-8"></span></th>
              <th><span className="placeholder col-6"></span></th>
              <th><span className="placeholder col-10"></span></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: count }).map((_, i) => (
              <tr key={i} className="placeholder-glow">
                <td><span className="placeholder col-6"></span></td>
                <td><span className="placeholder col-4"></span></td>
                <td>
                  <span className="placeholder col-4 bg-primary me-2"></span>
                  <span className="placeholder col-3 bg-secondary"></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Fallback: spinner
  return (
    <div className="loading-wrapper py-5 text-center">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Cargando...</span>
      </div>
      <p className="loading-text text-muted mt-3 fw-medium">Cargando datos...</p>
    </div>
  );
};

export default Loading;
