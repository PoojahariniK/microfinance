import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Search, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Staff {
  id: number;
  username: string;
  name: string;
  phone: string;
  address: string;
  role: string;
  status: string;
}

export default function StaffPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "", password: "", name: "", phone: "", address: "", role: ""
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ id: number; name: string; phone: string; address: string; status: string } | null>(null);

  const fetchStaff = useCallback(async (query?: string) => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      let url = `${API_BASE}/api/users`;
      
      if (!isAdmin) {
        url = `${API_BASE}/api/users/username/${user.username}`;
      } else if (query) {
        url = `${API_BASE}/api/users/username/${query}`;
      }

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "loggedInUser": user.username,
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          setStaff([]); // not found
          return;
        }
        throw new Error(`Failed to fetch staff: ${res.statusText}`);
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setStaff(data);
      } else {
        setStaff([data]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSearch = () => {
    if (searchQuery.trim() === "") {
      fetchStaff();
    } else {
      fetchStaff(searchQuery.trim());
    }
  };

  const handleCreate = async () => {
    if (!createForm.username || !createForm.password || !createForm.name || !createForm.phone || !createForm.address || !createForm.role) {
      setError("All fields are required to create a user.");
      return;
    }

    if (createForm.phone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "loggedInUser": user!.username,
        },
        body: JSON.stringify(createForm),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to create user.");
      }
      
      setCreateForm({ username: "", password: "", name: "", phone: "", address: "", role: "" });
      setCreateOpen(false);
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (s: Staff) => {
    setError("");
    setEditForm({ 
      id: s.id, 
      name: s.name || "", 
      phone: s.phone || "", 
      address: s.address || "", 
      status: s.status || "ACTIVE" 
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editForm || !editForm.name || !editForm.phone || !editForm.address || !editForm.status) {
      setError("All fields are required for updating a user.");
      return;
    }

    if (editForm.phone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/users/${editForm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "loggedInUser": user!.username,
        },
        body: JSON.stringify({
          name: editForm.name,
          phone: editForm.phone,
          address: editForm.address,
          status: editForm.status
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to update user.");
      }
      
      setEditOpen(false);
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/users/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "loggedInUser": user!.username,
        },
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to delete user.");
      }
      
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="page-header mb-0">Staff Management</h2>
        
        {isAdmin && (
          <div className="flex w-full sm:w-auto items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-9"
                placeholder="Search by username..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button size="sm" onClick={handleSearch} className="hidden sm:flex">
              Search
            </Button>
            <Button size="sm" className="gap-2 shrink-0" onClick={() => { setError(""); setCreateOpen(true); }}>
              <Plus className="h-4 w-4" />Add Staff
            </Button>
          </div>
        )}
      </div>

      {error && !createOpen && !editOpen && (
        <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20">
          {error}
        </div>
      )}

      <div className="form-section overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left py-3 px-4">Username</th>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Role</th>
              <th className="text-left py-3 px-4">Phone</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">Loading staff data...</td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No staff found matching search query." : "No staff memebers found."}
                </td>
              </tr>
            ) : (
              staff.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 font-medium">{s.username}</td>
                  <td className="py-3 px-4">{s.name || "-"}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.role === "ADMIN" ? "bg-primary/15 text-primary" : "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"}`}>
                      {s.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">{s.phone || "-"}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.status === "ACTIVE" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditModal(s)} title="Edit">
                         <Edit className="h-4 w-4" />
                       </Button>
                      
                       {isAdmin && s.role !== "ADMIN" && (
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s.id)} title="Delete">
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      <Dialog open={createOpen} onOpenChange={(val) => { setError(""); setCreateOpen(val); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="p-3 text-xs font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} placeholder="johndoe" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="+1234567890" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={createForm.address} onChange={e => setCreateForm({ ...createForm, address: e.target.value })} placeholder="123 Main St" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={createForm.role} onValueChange={v => setCreateForm({ ...createForm, role: v })}>
                <SelectTrigger id="role"><SelectValue placeholder="Select user role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="STAFF">Staff (Collector)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full mt-2">Create Staff Member</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={(val) => { setError(""); setEditOpen(val); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Staff Details</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20 mb-4">
              {error}
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input id="edit-name" value={editForm?.name || ""} onChange={e => setEditForm(prev => ({ ...prev!, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input id="edit-phone" value={editForm?.phone || ""} onChange={e => setEditForm(prev => ({ ...prev!, phone: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" value={editForm?.address || ""} onChange={e => setEditForm(prev => ({ ...prev!, address: e.target.value }))} />
            </div>
            {isAdmin && (
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Account Status</Label>
                <Select value={editForm?.status || "ACTIVE"} onValueChange={v => setEditForm(prev => ({ ...prev!, status: v }))}>
                  <SelectTrigger id="edit-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="DISABLED">DISABLED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleUpdate} className="w-full mt-2">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
