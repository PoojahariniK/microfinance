import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Edit, Eye, User, Image as ImageIcon, Users, AlertTriangle, Calendar, Phone, MapPin, Briefcase, Landmark, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Member {
  id: number;
  name: string;
  phone: string;
  address: string;
  aadhaarNumber: string;
  dob: string;
  gender: string;
  occupation: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineePhone: string;
  photoPath: string;
  status: string;
  createdAt?: string;
  groupIds: number[];
}

interface Group {
  id: number;
  groupName: string;
}

export default function Members() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", phone: "", address: "", aadhaarNumber: "", 
    dob: "", gender: "MALE", occupation: "",
    bankName: "", accountNumber: "", ifscCode: "",
    nomineeName: "", nomineeRelation: "", nomineePhone: ""
  });
  const [createFile, setCreateFile] = useState<File | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editFile, setEditFile] = useState<File | null>(null);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<Member | null>(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const fetchMembers = useCallback(async (groupId?: string) => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      let url = `${API_BASE}/api/members`;
      if (groupId && groupId !== "all") {
        url = `${API_BASE}/api/members/group/${groupId}`;
      }

      const res = await fetch(url, {
        headers: { "loggedInUser": user.username },
      });
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = await res.json();
      setMembers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/groups`, {
        headers: { "loggedInUser": user.username },
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    fetchMembers();
    fetchGroups();
  }, [fetchMembers, fetchGroups]);

  const handleGroupFilter = (value: string) => {
    setSelectedGroupId(value);
    fetchMembers(value);
  };

  const filtered = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.aadhaarNumber.includes(search) ||
    m.phone.includes(search)
  );

  const handleCreateSubmit = async () => {
    if (!createForm.name || !createForm.phone || !createForm.aadhaarNumber) {
      setError("Name, Phone, and Aadhaar are required.");
      return;
    }
    
    if (createForm.phone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    if (createForm.aadhaarNumber.length !== 12) {
      setError("Aadhaar number must be exactly 12 digits.");
      return;
    }

    const formData = new FormData();
    const body = { ...createForm, dob: createForm.dob || null };
    formData.append("member", new Blob([JSON.stringify(body)], { type: "application/json" }));
    if (createFile) {
      formData.append("file", createFile);
    }

    try {
      const res = await fetch(`${API_BASE}/api/members`, {
        method: "POST",
        headers: { "loggedInUser": user!.username },
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text() || "Failed to create member");
      
      setCreateOpen(false);
      setCreateForm({
        name: "", phone: "", address: "", aadhaarNumber: "", 
        dob: "", gender: "MALE", occupation: "",
        bankName: "", accountNumber: "", ifscCode: "",
        nomineeName: "", nomineeRelation: "", nomineePhone: ""
      });
      setCreateFile(null);
      fetchMembers(selectedGroupId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (m: Member) => {
    setError("");
    setEditForm({ ...m });
    setEditFile(null);
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (editForm.phone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    if (editForm.aadhaarNumber.length !== 12) {
      setError("Aadhaar number must be exactly 12 digits.");
      return;
    }

    // Filter payload to only include fields backend DTO expects
    const { id, photoPath, createdAt, groupIds: _, ...rest } = editForm;
    const updatePayload = { 
      ...rest, 
      dob: editForm.dob || null,
      status: editForm.status
    };

    const formData = new FormData();
    formData.append("member", new Blob([JSON.stringify(updatePayload)], { type: "application/json" }));
    if (editFile) {
      formData.append("file", editFile);
    }

    try {
      const res = await fetch(`${API_BASE}/api/members/${editForm.id}`, {
        method: "PUT",
        headers: { "loggedInUser": user!.username },
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text() || "Failed to update member");
      
      setEditOpen(false);
      fetchMembers(selectedGroupId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMemberToGroup = async (groupId: number) => {
    if (!selectedMember || !user) return;
    try {
      const res = await fetch(`${API_BASE}/api/members/group/${groupId}/add/${selectedMember.id}`, {
        method: "POST",
        headers: { "loggedInUser": user.username },
      });
      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errObj = JSON.parse(errorText);
          throw new Error(errObj.message || "Failed to add member to group");
        } catch {
          throw new Error(errorText || "Failed to add member to group");
        }
      }
      
      // Update local state for immediate feedback
      const updatedMembers = members.map(m => {
        if (m.id === selectedMember.id) {
          return { ...m, groupIds: [...(m.groupIds || []), groupId] };
        }
        return m;
      });
      setMembers(updatedMembers);
      setSelectedMember(prev => prev ? { ...prev, groupIds: [...(prev.groupIds || []), groupId] } : null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMemberFromGroup = async (groupId: number) => {
    if (!selectedMember || !user) return;
    try {
      const res = await fetch(`${API_BASE}/api/members/group/${groupId}/remove/${selectedMember.id}`, {
        method: "DELETE",
        headers: { "loggedInUser": user.username },
      });
      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errObj = JSON.parse(errorText);
          throw new Error(errObj.message || "Failed to remove member from group");
        } catch {
          throw new Error(errorText || "Failed to remove member from group");
        }
      }
      
      // Update local state
      const updatedMembers = members.map(m => {
        if (m.id === selectedMember.id) {
          return { ...m, groupIds: (m.groupIds || []).filter(id => id !== groupId) };
        }
        return m;
      });
      setMembers(updatedMembers);
      setSelectedMember(prev => prev ? { ...prev, groupIds: (prev.groupIds || []).filter(id => id !== groupId) } : null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderPhoto = (path: string) => {
    if (!path) return <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center"><User className="h-5 w-5 text-muted-foreground" /></div>;
    return <img src={`${API_BASE}/${path}`} alt="Member" className="w-10 h-10 rounded-full object-cover border" />;
  };

  const getGroupName = (id: number) => {
    const group = groups.find(g => g.id === id);
    return group ? group.groupName : `Group ${id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="page-header mb-0">Members</h2>
        {isAdmin && (
          <Button size="sm" className="gap-2" onClick={() => { setError(""); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" />Add Member
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label className="text-sm whitespace-nowrap">Filter by Group:</Label>
          <Select value={selectedGroupId} onValueChange={handleGroupFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map(g => <SelectItem key={g.id} value={g.id.toString()}>{g.groupName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && !createOpen && !editOpen && !groupModalOpen && (
        <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20">
          {error}
        </div>
      )}

      <div className="form-section overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Aadhaar</th>
              <th>Groups</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading members...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No members found.</td></tr>
            ) : (
              filtered.map(m => (
                <tr key={m.id}>
                  <td>{renderPhoto(m.photoPath)}</td>
                  <td className="font-medium">{m.name}</td>
                  <td>{m.phone || "-"}</td>
                  <td>{m.aadhaarNumber || "-"}</td>
                  <td>
                     <div className="flex flex-wrap gap-1 max-w-[200px]">
                         {m.groupIds && m.groupIds.length > 0 ? (
                           m.groupIds.map(gid => (
                             <span key={gid} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                                {getGroupName(gid)}
                             </span>
                           ))
                         ) : (
                           <span className="text-xs text-muted-foreground">None</span>
                         )}
                      </div>
                  </td>
                  <td>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${m.status === "ACTIVE" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => { setViewData(m); setViewOpen(true); }} title="View Profile">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(m)} title="Edit Member">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setSelectedMember(m); setGroupModalOpen(true); }} title="Manage Groups">
                              <Users className="h-3.5 w-3.5" />
                            </Button>
                          </>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Member</DialogTitle></DialogHeader>
          {error && (
            <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20 mt-2">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 py-4">
             <div className="col-span-2 flex justify-center mb-2">
                <div className="relative group">
                   <div className="w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted">
                      {createFile ? (
                        <img src={URL.createObjectURL(createFile)} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                   </div>
                   <input 
                      type="file" 
                      id="photo-upload" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => setCreateFile(e.target.files?.[0] || null)} 
                   />
                   <Label 
                      htmlFor="photo-upload" 
                      className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-full transition-opacity text-xs font-medium"
                   >
                      Upload Photo
                   </Label>
                </div>
             </div>

            <div className="space-y-2">
              <Label className="text-xs">Full Name *</Label>
              <Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Phone Number *</Label>
              <Input value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Aadhaar Number *</Label>
              <Input value={createForm.aadhaarNumber} onChange={e => setCreateForm({ ...createForm, aadhaarNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Gender</Label>
              <Select value={createForm.gender} onValueChange={v => setCreateForm({ ...createForm, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Date of Birth</Label>
              <Input type="date" value={createForm.dob} onChange={e => setCreateForm({ ...createForm, dob: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Occupation</Label>
              <Input value={createForm.occupation} onChange={e => setCreateForm({ ...createForm, occupation: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-xs">Address *</Label>
              <Input value={createForm.address} onChange={e => setCreateForm({ ...createForm, address: e.target.value })} />
            </div>

            <div className="col-span-2 pt-2 border-t mt-2"><h3 className="text-sm font-semibold">Bank Information</h3></div>
            <div className="space-y-2">
              <Label className="text-xs">Bank Name</Label>
              <Input value={createForm.bankName} onChange={e => setCreateForm({ ...createForm, bankName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Account Number</Label>
              <Input value={createForm.accountNumber} onChange={e => setCreateForm({ ...createForm, accountNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">IFSC Code</Label>
              <Input value={createForm.ifscCode} onChange={e => setCreateForm({ ...createForm, ifscCode: e.target.value })} />
            </div>

            <div className="col-span-2 pt-2 border-t mt-2"><h3 className="text-sm font-semibold">Nominee Details</h3></div>
            <div className="space-y-2">
              <Label className="text-xs">Nominee Name</Label>
              <Input value={createForm.nomineeName} onChange={e => setCreateForm({ ...createForm, nomineeName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Relation</Label>
              <Input value={createForm.nomineeRelation} onChange={e => setCreateForm({ ...createForm, nomineeRelation: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nominee Phone</Label>
              <Input value={createForm.nomineePhone} onChange={e => setCreateForm({ ...createForm, nomineePhone: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleCreateSubmit} className="w-full">Save Member</Button>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={(val) => { setError(""); setEditOpen(val); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Member: {editForm?.name}</DialogTitle></DialogHeader>
          {error && (
            <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20 mt-2">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 py-4">
             <div className="col-span-2 flex justify-center mb-2">
                <div className="relative group">
                   <div className="w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted">
                      {editFile ? (
                        <img src={URL.createObjectURL(editFile)} alt="Preview" className="w-full h-full object-cover" />
                      ) : editForm?.photoPath ? (
                        <img src={`${API_BASE}/${editForm.photoPath}`} alt="Member" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                   </div>
                   <input 
                      type="file" 
                      id="edit-photo-upload" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => setEditFile(e.target.files?.[0] || null)} 
                   />
                   <Label 
                      htmlFor="edit-photo-upload" 
                      className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-full transition-opacity text-xs font-medium"
                   >
                      Change Photo
                   </Label>
                </div>
             </div>

            <div className="space-y-2">
              <Label className="text-xs">Full Name</Label>
              <Input value={editForm?.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Phone Number</Label>
              <Input value={editForm?.phone || ""} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Aadhaar Number</Label>
              <Input value={editForm?.aadhaarNumber || ""} onChange={e => setEditForm({ ...editForm, aadhaarNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Status</Label>
              <Select value={editForm?.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                   <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                 </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Gender</Label>
              <Select value={editForm?.gender} onValueChange={v => setEditForm({ ...editForm, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Date of Birth</Label>
              <Input type="date" value={editForm?.dob || ""} onChange={e => setEditForm({ ...editForm, dob: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Occupation</Label>
              <Input value={editForm?.occupation || ""} onChange={e => setEditForm({ ...editForm, occupation: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-xs">Address</Label>
              <Input value={editForm?.address || ""} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
            </div>

            <div className="col-span-2 pt-2 border-t mt-2"><h3 className="text-sm font-semibold">Bank Information</h3></div>
            <div className="space-y-2">
               <Label className="text-xs">Bank Name</Label>
               <Input value={editForm?.bankName || ""} onChange={e => setEditForm({ ...editForm, bankName: e.target.value })} />
            </div>
            <div className="space-y-2">
               <Label className="text-xs">Account Number</Label>
               <Input value={editForm?.accountNumber || ""} onChange={e => setEditForm({ ...editForm, accountNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
               <Label className="text-xs">IFSC Code</Label>
               <Input value={editForm?.ifscCode || ""} onChange={e => setEditForm({ ...editForm, ifscCode: e.target.value })} />
            </div>

            <div className="col-span-2 pt-2 border-t mt-2"><h3 className="text-sm font-semibold">Nominee Details</h3></div>
            <div className="space-y-2">
               <Label className="text-xs">Nominee Name</Label>
               <Input value={editForm?.nomineeName || ""} onChange={e => setEditForm({ ...editForm, nomineeName: e.target.value })} />
            </div>
            <div className="space-y-2">
               <Label className="text-xs">Relation</Label>
               <Input value={editForm?.nomineeRelation || ""} onChange={e => setEditForm({ ...editForm, nomineeRelation: e.target.value })} />
            </div>
            <div className="space-y-2">
               <Label className="text-xs">Nominee Phone</Label>
               <Input value={editForm?.nomineePhone || ""} onChange={e => setEditForm({ ...editForm, nomineePhone: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleEditSubmit} className="w-full">Update Member</Button>
        </DialogContent>
      </Dialog>

      {/* VIEW MODAL */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Member Profile: {viewData?.name}
            </DialogTitle>
          </DialogHeader>
          
          {viewData && (
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-32 h-32 rounded-2xl overflow-hidden border shadow-sm shrink-0 bg-muted">
                  {viewData.photoPath ? (
                    <img src={`${API_BASE}/${viewData.photoPath}`} alt={viewData.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><User className="h-12 w-12 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{viewData.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${viewData.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {viewData.status}
                      </span>
                      <span className="text-xs text-muted-foreground">Member ID: #{viewData.id}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> <span>{viewData.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> <span>Born: {viewData.dob || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="line-clamp-1">{viewData.address}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal & Occupation */}
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100 uppercase tracking-wider">
                    <h4 className="text-[10px] font-black text-slate-400 flex items-center gap-2">
                      <Briefcase className="h-3 w-3" /> Personal Info
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400">AADHAAR</p>
                        <p className="text-xs font-bold text-slate-700">{viewData.aadhaarNumber}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400">GENDER</p>
                        <p className="text-xs font-bold text-slate-700">{viewData.gender}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[9px] font-bold text-slate-400">OCCUPATION</p>
                        <p className="text-xs font-bold text-slate-700">{viewData.occupation || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-xl space-y-3 border border-blue-100 uppercase tracking-wider">
                    <h4 className="text-[10px] font-black text-blue-400 flex items-center gap-2">
                      <Landmark className="h-3 w-3" /> Bank Details
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-blue-400">BANK</span>
                        <span className="text-xs font-bold text-blue-700">{viewData.bankName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-blue-400">ACCOUNT</span>
                        <span className="text-xs font-bold text-blue-700">{viewData.accountNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-blue-400">IFSC</span>
                        <span className="text-xs font-bold text-blue-700">{viewData.ifscCode || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nominee & Groups */}
                <div className="space-y-4">
                  <div className="bg-rose-50/50 p-4 rounded-xl space-y-3 border border-rose-100 uppercase tracking-wider">
                    <h4 className="text-[10px] font-black text-rose-400 flex items-center gap-2">
                      <UserPlus className="h-3 w-3" /> Nominee Info
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-rose-400">NAME</span>
                        <span className="text-xs font-bold text-rose-700">{viewData.nomineeName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-rose-400">RELATION</span>
                        <span className="text-xs font-bold text-rose-700">{viewData.nomineeRelation || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-rose-400">PHONE</span>
                        <span className="text-xs font-bold text-rose-700">{viewData.nomineePhone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 p-4 rounded-xl space-y-3 border border-emerald-100 uppercase tracking-wider">
                    <h4 className="text-[10px] font-black text-emerald-400 flex items-center gap-2">
                      <Users className="h-3 w-3" /> Group Membership
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {viewData.groupIds && viewData.groupIds.length > 0 ? (
                        viewData.groupIds.map(id => (
                          <span key={id} className="text-[10px] font-black bg-white px-2 py-1 rounded-lg border border-emerald-200 text-emerald-700 shadow-sm">
                            {getGroupName(id)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not assigned to any group</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Registered: {viewData.createdAt ? new Date(viewData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
                <Button variant="outline" size="sm" onClick={() => setViewOpen(false)}>Close Profile</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MANAGE GROUPS MODAL */}
      <Dialog open={groupModalOpen} onOpenChange={(val) => { setError(""); setGroupModalOpen(val); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Groups: {selectedMember?.name}</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="p-4 text-sm font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20 mb-4 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}
          <div className="py-4 space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              Select groups to add or remove this member.
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
              {groups.map(group => {
                const isInGroup = selectedMember?.groupIds?.includes(group.id);
                return (
                  <div key={group.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <span className="font-medium text-sm">{group.groupName}</span>
                    {isInGroup ? (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="h-8 px-3"
                        onClick={() => handleRemoveMemberFromGroup(group.id)}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-3 border-primary text-primary hover:bg-primary/10"
                        onClick={() => handleAddMemberToGroup(group.id)}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                );
              })}
              {groups.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">No groups available.</div>
              )}
            </div>
            <Button onClick={() => setGroupModalOpen(false)} className="w-full mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
