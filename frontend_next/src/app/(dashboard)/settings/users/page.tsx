"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Shield, CheckCircle2, XCircle, MoreVertical, Search, Loader2, X, Mail } from "lucide-react";
import toast from "react-hot-toast";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteData, setInviteData] = useState({
    name: "",
    email: "",
    role: "hr"
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { default: apiClient } = await import("@/api/client");
      const res = await apiClient.get('/admin/users');
      setUsers(res.data.users || res.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.name || !inviteData.email) return;

    setInviting(true);
    try {
      const { default: apiClient } = await import("@/api/client");
      const endpoint = inviteData.role === "hr" ? "/admin/invite-hr" : "/admin/invite-interviewer";
      
      await apiClient.post(endpoint, {
        name: inviteData.name,
        email: inviteData.email
      });
      
      toast.success(`${inviteData.role.toUpperCase()} user invited successfully!`);
      setShowInviteModal(false);
      fetchUsers(); // Refresh list
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto space-y-8 pb-10">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-[var(--color-primary)]" />
            User & Role Management
          </h1>
          <p className="text-[var(--color-text-muted)]">Securely manage internal staff access and permissions.</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="px-5 py-2.5 bg-gradient-primary text-white hover:opacity-90 rounded-xl font-medium transition-opacity flex items-center gap-2 shadow-lg shadow-primary/30"
        >
          <UserPlus className="w-5 h-5" />
          Invite User
        </button>
      </header>

      {/* Controls */}
      <div className="flex items-center justify-between glass-panel p-4 rounded-2xl border border-[var(--color-border)]">
        <div className="relative w-96">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-[var(--color-text-muted)]" />
          </div>
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl py-2.5 pl-11 pr-4 text-white text-sm outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-shadow"
          />
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm font-medium text-white">
            Total Users: <span className="text-[var(--color-primary)] ml-1">{users.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-[var(--color-border)] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredUsers.map((user) => (
                <motion.tr 
                  key={user._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-secondary)]/20 flex items-center justify-center border border-[var(--color-border)] text-white font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{user.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Active
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-red-400 text-sm font-medium">
                        <XCircle className="w-4 h-4" /> Inactive
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-[var(--color-text-muted)] hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowInviteModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-md rounded-3xl relative z-10 overflow-hidden flex flex-col border border-[var(--color-border)] shadow-2xl"
            >
              <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-white/5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[var(--color-primary)]" />
                  Invite Internal User
                </h2>
                <button onClick={() => setShowInviteModal(false)} className="text-[var(--color-text-muted)] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleInvite} className="p-6 space-y-5">
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 ml-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Users className="h-5 w-5 text-[var(--color-text-muted)]" />
                    </div>
                    <input 
                      type="text" required
                      value={inviteData.name} onChange={e => setInviteData({...inviteData, name: e.target.value})}
                      className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-[var(--color-background)] text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all sm:text-sm"
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 ml-1">Company Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-[var(--color-text-muted)]" />
                    </div>
                    <input 
                      type="email" required
                      value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})}
                      className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-[var(--color-background)] text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all sm:text-sm"
                      placeholder="jane@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 ml-1">Access Role</label>
                  <select 
                    value={inviteData.role} 
                    onChange={e => setInviteData({...inviteData, role: e.target.value})} 
                    className="block w-full px-4 py-3 border border-white/10 rounded-xl bg-[var(--color-background)] text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all sm:text-sm"
                  >
                    <option value="hr">HR / Recruiter</option>
                    <option value="interviewer">Interviewer / Hiring Manager</option>
                  </select>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2 ml-1">
                    An invitation email will be sent automatically to help them set their password.
                  </p>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-border)]">
                  <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-[var(--color-text-muted)] hover:text-white font-medium">Cancel</button>
                  <button type="submit" disabled={inviting} className="px-6 py-2 bg-gradient-primary text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20">
                    {inviting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send Invitation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
