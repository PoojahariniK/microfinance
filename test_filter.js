const availableSchedules = [
  { installmentNo: 1, members: [] },
  { installmentNo: 2, members: [] },
  { installmentNo: 3, members: [] },
  { installmentNo: 4, members: [] },
  { installmentNo: 5, members: [{ memberId: 1, status: 'PENDING' }] }
];
const memberId = 1;
const collectionData = { installmentNo: 5 };
const unpaidPrevious = availableSchedules.filter(s => s.installmentNo < collectionData.installmentNo)
.map(s => {
  const memberSched = s.members.find(sm => sm.memberId === memberId);
  return { installmentNo: s.installmentNo, memberSched };
})
.filter(s => s.memberSched && s.memberSched.status !== 'PAID');
console.log(unpaidPrevious);

