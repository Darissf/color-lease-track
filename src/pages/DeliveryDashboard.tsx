import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Plus, MapPin, Clock, CheckCircle, Search, Eye, Play } from "lucide-react";
import { useDeliveryTracking } from "@/hooks/useDeliveryTracking";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const { trips, loading, startTrip } = useDeliveryTracking();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTrips = trips.filter(trip => {
    const matchesStatus = statusFilter === "all" || trip.status === statusFilter;
    const matchesSearch = !searchQuery || 
      trip.trip_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.driver_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: trips.length,
    pending: trips.filter(t => t.status === 'pending').length,
    in_progress: trips.filter(t => t.status === 'in_progress').length,
    completed: trips.filter(t => t.status === 'completed').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dalam Perjalanan</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Selesai</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStartTrip = async (tripId: string) => {
    await startTrip(tripId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Live Tracking Delivery</h1>
          <p className="text-slate-500">Pantau pengiriman secara real-time</p>
        </div>
        <Button onClick={() => navigate('/vip/delivery/create')} className="bg-[#487FFF] hover:bg-[#3a6ee6]">
          <Plus className="h-4 w-4 mr-2" />
          Buat Trip Baru
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Truck className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Trip</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.in_progress}</p>
                <p className="text-xs text-slate-500">Dalam Perjalanan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.completed}</p>
                <p className="text-xs text-slate-500">Selesai</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Cari kode trip atau nama driver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">Dalam Perjalanan</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trip List */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Daftar Trip Pengiriman</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Memuat data...</div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Belum ada trip pengiriman
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode Trip</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Jumlah Stop</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="font-medium">{trip.trip_code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{trip.driver_name}</p>
                          <p className="text-xs text-slate-500">{trip.driver_phone || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {trip.delivery_stops?.length || 0} stop
                      </TableCell>
                      <TableCell>{getStatusBadge(trip.status || 'pending')}</TableCell>
                      <TableCell>
                        {trip.created_at ? format(new Date(trip.created_at), 'dd MMM yyyy, HH:mm', { locale: id }) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {trip.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleStartTrip(trip.id)}
                              className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Mulai
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/vip/delivery/trip/${trip.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Detail
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryDashboard;
