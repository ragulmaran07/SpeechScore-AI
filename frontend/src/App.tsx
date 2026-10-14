import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { OverviewPage } from './pages/OverviewPage';
import { NewEvaluationPage } from './pages/NewEvaluationPage';
import { ResultsPage } from './pages/ResultsPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { FlawTimelinePage } from './pages/FlawTimelinePage';
import { DatasetPage } from './pages/DatasetPage';
import { HistoryPage } from './pages/HistoryPage';
import { RubricPage } from './pages/RubricPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="evaluations/new" element={<NewEvaluationPage />} />
          <Route path="evaluations/:id" element={<ResultsPage />} />
          <Route path="comparison" element={<ComparisonPage />} />
          <Route path="flaws" element={<FlawTimelinePage />} />
          <Route path="dataset" element={<DatasetPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="rubrics" element={<RubricPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
