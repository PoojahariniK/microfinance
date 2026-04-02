import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Group {
  id: number;
  groupName: string;
  collectionType: string;
  collectionDay: string;
  collectionStaff: string;
  status: string;
  createdAt?: string;
}

interface GroupMember {
  id: number;
  name: string;
  phone: string;
  aadhaarNumber: string;
  activeInAnotherLoan: boolean;
}

interface StaffUser {
  id: number;
  username: string;
  name: string;
}

export default function Groups() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [staffId, setStaffId] = useState<number | null>(null);

  // Members Modal state
  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Create Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ 
    groupName: "", collectionType: "", collectionDay: "", collectionStaffId: "", status: "ACTIVE" 
  });

  // Edit Modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/groups`, {
        headers: {
          "Content-Type": "application/json",
          "loggedInUser": user.username,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      setGroups(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchStaffData = useCallback(async () => {
    if (!user) return;
    try {
      if (isAdmin) {
        // fetch all users to pick staff
        const res = await fetch(`${API_BASE}/api/users`, {
          headers: { "loggedInUser": user.username },
        });
        if (res.ok) {
          const data = await res.json();
          setStaffUsers(data.filter((u: any) => u.role === "STAFF"));
        }
      } else {
        // fetch own user details to know ID
        const res = await fetch(`${API_BASE}/api/users/username/${user.username}`, {
          headers: { "loggedInUser": user.username },
        });
        if (res.ok) {
          const data = await res.json();
          setStaffId(data.id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch staff data", err);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchGroups();
    fetchStaffData();
  }, [fetchGroups, fetchStaffData]);

  const handleViewMembers = async (group: Group) => {
    setSelectedGroupName(group.groupName);
    setMembersOpen(true);
    setMembersLoading(true);
    setGroupMembers([]);
    try {
      const res = await fetch(`${API_BASE}/api/groups/${group.id}/members?active=true`, {
        headers: { "loggedInUser": user!.username },
      });
      if (!res.ok) throw new Error("Failed to load members");
      const data = await res.json();
      setGroupMembers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCreateSubmit = async () => {
    if (!createForm.groupName || !createForm.collectionType || !createForm.collectionDay || !createForm.collectionStaffId) {
      setError("All fields are required to create a group.");
      return;
    }
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "loggedInUser": user!.username,
        },
        body: JSON.stringify({
          groupName: createForm.groupName,
          collectionType: createForm.collectionType,
          collectionDay: createForm.collectionDay,
          collectionStaffId: parseInt(createForm.collectionStaffId)
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to create group.");
      }
      
      setCreateForm({ groupName: "", collectionType: "", collectionDay: "", collectionStaffId: "", status: "ACTIVE" });
      setCreateOpen(false);
      fetchGroups();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (g: Group) => {
    let matchingStaffId = "";
    if (isAdmin) {
      const sUser = staffUsers.find(u => u.username === g.collectionStaff);
      if (sUser) matchingStaffId = sUser.id.toString();
    } else {
      matchingStaffId = staffId ? staffId.toString() : "";
    }

    setEditForm({
      id: g.id,
      groupName: g.groupName,
      collectionType: g.collectionType,
      collectionDay: g.collectionDay,
      collectionStaffId: matchingStaffId,
      status: g.status || "ACTIVE"
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editForm.groupName || !editForm.collectionType || !editForm.collectionDay) {
      setError("Fields cannot be empty.");
      return;
    }
    if (isAdmin && !editForm.collectionStaffId) {
      setError("Collector must be assigned.");
      return;
    }

    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/groups/${editForm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "loggedInUser": user!.username,
        },
        body: JSON.stringify({
          groupName: editForm.groupName,
          collectionType: editForm.collectionType,
          collectionDay: editForm.collectionDay,
          collectionStaffId: editForm.collectionStaffId ? parseInt(editForm.collectionStaffId) : null,
          status: editForm.status
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to update group.");
      }
      
      setEditOpen(false);
      fetchGroups();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="page-header mb-0">Groups</h2>
        
        {isAdmin && (
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />Add Group
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20">
          {error}
        </div>
      )}

      <div className="form-section overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Group Name</th>
              <th>Type</th>
              <th>Day</th>
              <th>Collector</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">Loading groups...</td></tr>
            ) : groups.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">No groups found.</td></tr>
            ) : (
              groups.map(g => (
                <tr key={g.id}>
                  <td className="font-medium">{g.id}</td>
                  <td>{g.groupName || "-"}</td>
                  <td>{g.collectionType || "-"}</td>
                  <td>{g.collectionDay || "-"}</td>
                  <td>{g.collectionStaff || "-"}</td>
                  <td>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${g.status === "ACTIVE" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {g.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-primary" onClick={() => handleViewMembers(g)}>
                        <Users className="h-3.5 w-3.5" /> Members
                      </Button>
                      {(isAdmin || g.collectionStaff === user?.username) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(g)}>
                          <Edit className="h-3.5 w-3.5" />
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
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Group</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label className="text-xs">Group Name</Label>
              <Input value={createForm.groupName} onChange={e => setCreateForm({ ...createForm, groupName: e.target.value })} className="mt-1" placeholder="e.g. Mahila Samithi" />
            </div>
            <div>
              <Label className="text-xs">Collection Type</Label>
              <Select value={createForm.collectionType} onValueChange={v => setCreateForm({ ...createForm, collectionType: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Collection Day</Label>
              <Select value={createForm.collectionDay} onValueChange={v => setCreateForm({ ...createForm, collectionDay: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Day" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONDAY">Monday</SelectItem>
                  <SelectItem value="TUESDAY">Tuesday</SelectItem>
                  <SelectItem value="WEDNESDAY">Wednesday</SelectItem>
                  <SelectItem value="THURSDAY">Thursday</SelectItem>
                  <SelectItem value="FRIDAY">Friday</SelectItem>
                  <SelectItem value="SATURDAY">Saturday</SelectItem>
                  <SelectItem value="SUNDAY">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Assigned Collector</Label>
              <Select value={createForm.collectionStaffId} onValueChange={v => setCreateForm({ ...createForm, collectionStaffId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Assign a staff member" /></SelectTrigger>
                <SelectContent>
                  {staffUsers.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.username})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleCreateSubmit} className="w-full">Create Group</Button>
        </DialogContent>
      </Dialog>
      
      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Group: {editForm?.groupName}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label className="text-xs">Group Name</Label>
              <Input value={editForm?.groupName || ""} onChange={e => setEditForm({ ...editForm, groupName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Collection Type</Label>
              <Select value={editForm?.collectionType || ""} onValueChange={v => setEditForm({ ...editForm, collectionType: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Collection Day</Label>
              <Select value={editForm?.collectionDay || ""} onValueChange={v => setEditForm({ ...editForm, collectionDay: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Day" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONDAY">Monday</SelectItem>
                  <SelectItem value="TUESDAY">Tuesday</SelectItem>
                  <SelectItem value="WEDNESDAY">Wednesday</SelectItem>
                  <SelectItem value="THURSDAY">Thursday</SelectItem>
                  <SelectItem value="FRIDAY">Friday</SelectItem>
                  <SelectItem value="SATURDAY">Saturday</SelectItem>
                  <SelectItem value="SUNDAY">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {isAdmin && (
              <div className="col-span-2">
                <Label className="text-xs">Assigned Collector</Label>
                <Select value={editForm?.collectionStaffId || ""} onValueChange={v => setEditForm({ ...editForm, collectionStaffId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Assign a staff member" /></SelectTrigger>
                  <SelectContent>
                    {staffUsers.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.username})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isAdmin && (
              <div className="col-span-2">
                 <Label className="text-xs">Status</Label>
                 <Select value={editForm?.status || ""} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                   <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                     <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                   </SelectContent>
                 </Select>
              </div>
            )}
          </div>
          <Button onClick={handleEditSubmit} className="w-full">Save Changes</Button>
        </DialogContent>
      </Dialog>
      
      {/* MEMBERS MODAL */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Members of {selectedGroupName}</DialogTitle></DialogHeader>
          <div className="mt-4 border rounded-md overflow-hidden max-h-[60vh] overflow-y-auto relative">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground border-b text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Aadhaar</th>
                </tr>
              </thead>
              <tbody>
                {membersLoading ? (
                  <tr><td colSpan={3} className="px-4 py-4 text-center">Loading members...</td></tr>
                ) : groupMembers.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-4 text-center">No active members found.</td></tr>
                ) : (
                  groupMembers.map((m) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium">{m.name || "-"}</td>
                      <td className="px-4 py-2">{m.phone || "-"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{m.aadhaarNumber || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
