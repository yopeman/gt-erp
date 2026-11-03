import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Briefcase,
  Search,
  Filter,
  MapPin,
  Calendar,
  ArrowRight,
  Sparkles,
  Building2,
  Clock,
  ShieldCheck
} from 'lucide-react';

export default function PublicJobs() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const fetchOpenPositions = async () => {
      setLoading(true);
      try {
        const res = await api.get('/job-positions?status=open');
        if (res.success && Array.isArray(res.data)) {
          setPositions(res.data);
        } else if (Array.isArray(res)) {
          setPositions(res);
        }
      } catch (err) {
        console.error('Failed to load job positions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOpenPositions();
  }, []);

  const filteredPositions = positions.filter((pos) => {
    const matchesSearch =
      !search ||
      pos.title?.toLowerCase().includes(search.toLowerCase()) ||
      pos.description?.toLowerCase().includes(search.toLowerCase());
    const matchesType =
      typeFilter === 'all' ||
      pos.type?.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  const jobTypes = Array.from(
    new Set(positions.map((p) => p.type).filter(Boolean))
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Public Header / Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/careers" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 text-white flex items-center justify-center font-black shadow-md shadow-primary-500/20">
              GT
            </div>
            <div>
              <span className="font-black text-base tracking-tight block text-slate-900 dark:text-white leading-none">
                GT-ERP
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary-600 dark:text-primary-400">
                Careers Portal
              </span>
            </div>
          </Link>

          {/* Empty right area or branding tag */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Join Our Team</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 bg-gradient-to-b from-white via-primary-50/20 to-transparent dark:from-slate-900 dark:via-primary-950/10 dark:to-transparent border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-primary-500" />
            <span>We are hiring talented minds</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Build Your Career With <span className="text-primary-500">Golden Tech</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Join an agile, innovative technology and operations team. Explore our current open vacancies below and apply online in minutes.
          </p>

          {/* Search & Filter Bar */}
          <div className="pt-4 max-w-2xl mx-auto">
            <div className="p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg shadow-slate-200/50 dark:shadow-none flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by job title or keyword..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-transparent rounded-xl focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Job Types</option>
                  {jobTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vacancies Listing Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-500" />
              <span>Available Positions</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {filteredPositions.length} open position{filteredPositions.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
            Loading open vacancies...
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No matching vacancies found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We couldn't find any positions matching your search. Try resetting your filters or check back later!
            </p>
            {(search || typeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setTypeFilter('all');
                }}
                className="px-4 py-2 text-xs font-bold text-primary-600 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPositions.map((pos) => (
              <Link
                key={pos._id}
                to={`/careers/${pos._id}`}
                className="group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary-500/50 dark:hover:border-primary-500/50 shadow-xs hover:shadow-lg hover:shadow-primary-500/5 transition duration-200 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200 dark:border-primary-900">
                      {pos.type || 'Full Time'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(pos.postedAt || pos.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-primary-500 transition">
                      {pos.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {pos.description || 'Join our team for this critical vacancy. Click to view detailed responsibilities.'}
                    </p>
                  </div>

                  {pos.requirements && pos.requirements.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pos.requirements.slice(0, 3).map((req, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {req}
                        </span>
                      ))}
                      {pos.requirements.length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{pos.requirements.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-primary-600 dark:text-primary-400 group-hover:translate-x-0.5 transition">
                  <span>View Details & Apply</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            GT-ERP Systems • Human Capital Management
          </p>
          <p>© {new Date().getFullYear()} Golden Technology Systems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
