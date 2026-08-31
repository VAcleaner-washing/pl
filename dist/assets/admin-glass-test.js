(()=>{
  'use strict';
  // v4.2.22: native client-card actions are the single source of truth.
  // Keep this compatibility file loaded for cache-safe rollout, but do not
  // inject duplicate call / new-rental controls into production modals.
  document.documentElement.dataset.clientActions='native';
})();
