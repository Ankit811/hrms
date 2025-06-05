// frontend/src/components/OTTable.jsx
import React, { useState, useEffect } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { Button } from '../components/ui/button';
import OTForm from './OTForm';

function OTTable({ unclaimedOTRecords, claimedOTRecords, onClaimSuccess }) {
  const [selectedOT, setSelectedOT] = useState(null);
  const [timers, setTimers] = useState({});

  useEffect(() => {
    const updateTimers = () => {
      const newTimers = {};
      unclaimedOTRecords.forEach((record) => {
        const deadline = new Date(record.claimDeadline);
        const now = new Date();
        const timeLeft = deadline - now;
        if (timeLeft > 0) {
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          newTimers[record._id] = `${hours}h ${minutes}m`;
        } else {
          newTimers[record._id] = 'Expired';
        }
      });
      setTimers(newTimers);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [unclaimedOTRecords]);

  const isClaimed = (record) => {
    return claimedOTRecords.some((claimed) => 
      new Date(claimed.date).toDateString() === new Date(record.date).toDateString()
    );
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Day</TableHead>
              <TableHead className="font-semibold">Hours</TableHead>
              <TableHead className="font-semibold">Time Left</TableHead>
              <TableHead className="font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unclaimedOTRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No unclaimed OT records found.
                </TableCell>
              </TableRow>
            ) : (
              unclaimedOTRecords.map((record) => (
                <TableRow key={record._id} className="hover:bg-gray-50">
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell>{record.day}</TableCell>
                  <TableCell>{record.hours}</TableCell>
                  <TableCell>{timers[record._id] || 'Calculating...'}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => setSelectedOT(record)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={timers[record._id] === 'Expired' || isClaimed(record)}
                    >
                      Apply
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {selectedOT && (
        <OTForm
          open={!!selectedOT}
          onOpenChange={() => setSelectedOT(null)}
          otRecord={selectedOT}
          onClaimSuccess={onClaimSuccess}
        />
      )}
    </>
  );
}

export default OTTable;

