// import React, { useState, useEffect, useRef } from 'react';
// import {
//   StyleSheet,
//   Text,
//   View,
//   TouchableOpacity,
//   TextInput,
//   ScrollView,
//   Alert,
//   ActivityIndicator,
//   Image,
//   Platform,
//   FlatList,
// } from 'react-native';
// // import { Camera, CameraType } from 'expo-camera';
// import { CameraView, useCameraPermissions } from 'expo-camera';


// import * as Location from 'expo-location';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { NavigationContainer } from '@react-navigation/native';
// import { createStackNavigator } from '@react-navigation/stack';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import Ionicons from 'react-native-vector-icons/Ionicons';

// const API_URL = 'http://69.164.247.86:8000';
// const Stack = createStackNavigator();
// const Tab = createBottomTabNavigator();

// // ============= Authentication Service =============
// const AuthService = {
//   async login(email, password) {
//     const response = await fetch(`${API_URL}/api/auth/login`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ email, password }),
//     });
//     const data = await response.json();
//     if (!response.ok) throw new Error(data.detail || 'Login failed');
//     await AsyncStorage.setItem('token', data.token);
//     await AsyncStorage.setItem('user', JSON.stringify(data.employee));
//     return data;
//   },

//   async logout() {
//     await AsyncStorage.removeItem('token');
//     await AsyncStorage.removeItem('user');
//   },

//   async getToken() {
//     return await AsyncStorage.getItem('token');
//   },

//   async getUser() {
//     const user = await AsyncStorage.getItem('user');
//     return user ? JSON.parse(user) : null;
//   },
// };

// // ============= API Service =============
// const ApiService = {
//   async checkIn(latitude, longitude, imageUri) {
//     const token = await AuthService.getToken();
//     const formData = new FormData();
//     formData.append('latitude', latitude);
//     formData.append('longitude', longitude);
//     formData.append('face_image', {
//       uri: imageUri,
//       type: 'image/jpeg',
//       name: 'face.jpg',
//     });

//     const response = await fetch(`${API_URL}/api/attendance/check-in`, {
//       method: 'POST',
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//       body: formData,
//     });

//     const data = await response.json();
//     if (!response.ok) throw new Error(data.detail || 'Check-in failed');
//     return data;
//   },

//   async checkOut(latitude, longitude, imageUri) {
//     const token = await AuthService.getToken();
//     const formData = new FormData();
//     formData.append('latitude', latitude);
//     formData.append('longitude', longitude);
//     formData.append('face_image', {
//       uri: imageUri,
//       type: 'image/jpeg',
//       name: 'face.jpg',
//     });

//     const response = await fetch(`${API_URL}/api/attendance/check-out`, {
//       method: 'POST',
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//       body: formData,
//     });

//     const data = await response.json();
//     if (!response.ok) throw new Error(data.detail || 'Check-out failed');
//     return data;
//   },

//   async getStatus() {
//     const token = await AuthService.getToken();
//     const response = await fetch(`${API_URL}/api/employee/status`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     const data = await response.json();
//     if (!response.ok) throw new Error('Failed to fetch status');
//     return data;
//   },

//   async getMyAttendance() {
//     const token = await AuthService.getToken();
//     const response = await fetch(`${API_URL}/api/employee/my-attendance`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     const data = await response.json();
//     if (!response.ok) throw new Error('Failed to fetch attendance');
//     return data.records;
//   },

//   async registerEmployee(employeeData, imageUri) {
//     const token = await AuthService.getToken();
//     const formData = new FormData();
//     formData.append('employee_id', employeeData.employee_id);
//     formData.append('name', employeeData.name);
//     formData.append('email', employeeData.email);
//     formData.append('password', employeeData.password);
//     formData.append('role', employeeData.role);
//     formData.append('face_image', {
//       uri: imageUri,
//       type: 'image/jpeg',
//       name: 'face.jpg',
//     });

//     const response = await fetch(`${API_URL}/api/admin/register-employee`, {
//       method: 'POST',
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//       body: formData,
//     });

//     const data = await response.json();
//     if (!response.ok) throw new Error(data.detail || 'Registration failed');
//     return data;
//   },

//   async getAttendance(date, employeeId) {
//     const token = await AuthService.getToken();
//     let url = `${API_URL}/api/admin/attendance?`;
//     if (date) url += `date=${date}&`;
//     if (employeeId) url += `employee_id=${employeeId}`;
    
//     const response = await fetch(url, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     const data = await response.json();
//     if (!response.ok) throw new Error('Failed to fetch attendance');
//     return data.records;
//   },

//   async getEmployees() {
//     const token = await AuthService.getToken();
//     const response = await fetch(`${API_URL}/api/admin/employees`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     const data = await response.json();
//     if (!response.ok) throw new Error('Failed to fetch employees');
//     return data.employees;
//   },
// };

// // ============= Login Screen =============
// function LoginScreen({ navigation }) {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleLogin = async () => {
//     if (!email || !password) {
//       Alert.alert('Error', 'Please fill in all fields');
//       return;
//     }

//     setLoading(true);
//     try {
//       const data = await AuthService.login(email, password);
//       if (data.employee.role === 'admin') {
//         navigation.replace('AdminTabs');
//       } else {
//         navigation.replace('EmployeeTabs');
//       }
//     } catch (error) {
//       Alert.alert('Login Failed', error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.loginContainer}>
//         <Text style={styles.title}>Employee Attendance</Text>
//         <Text style={styles.subtitle}>Facial Recognition System</Text>

//         <TextInput
//           style={styles.input}
//           placeholder="Email"
//           value={email}
//           onChangeText={setEmail}
//           autoCapitalize="none"
//           keyboardType="email-address"
//         />

//         <TextInput
//           style={styles.input}
//           placeholder="Password"
//           value={password}
//           onChangeText={setPassword}
//           secureTextEntry
//         />

//         <TouchableOpacity
//           style={[styles.button, loading && styles.buttonDisabled]}
//           onPress={handleLogin}
//           disabled={loading}
//         >
//           {loading ? (
//             <ActivityIndicator color="#fff" />
//           ) : (
//             <Text style={styles.buttonText}>Login</Text>
//           )}
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// // ============= Camera Capture Component =============
// function CameraCapture({ onCapture, onCancel }) {
//   const [facing, setFacing] = useState('front'); // Use 'front' or 'back' as strings
//   const [permission, requestPermission] = useCameraPermissions();
//   const cameraRef = useRef(null);

//   const takePicture = async () => {
//     if (cameraRef.current) {
//       const photo = await cameraRef.current.takePictureAsync({
//         quality: 0.7,
//         base64: false,
//       });
//       onCapture(photo.uri);
//     }
//   };

//   if (!permission) {
//     // Camera permissions are still loading
//     return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
//   }
  
//   if (!permission.granted) {
//     // Camera permissions not granted yet
//     return (
//       <View style={styles.container}>
//         <Text>No access to camera</Text>
//         <TouchableOpacity onPress={requestPermission}>
//           <Text>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.cameraContainer}>
//       <CameraView 
//         style={styles.camera} 
//         facing={facing}
//         ref={cameraRef}
//       >
//         <View style={styles.cameraOverlay}>
//           <View style={styles.faceGuide} />
//         </View>
//       </CameraView>
//       <View style={styles.cameraButtons}>
//         <TouchableOpacity style={styles.cameraButton} onPress={onCancel}>
//           <Text style={styles.cameraButtonText}>Cancel</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
//           <View style={styles.captureButtonInner} />
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={styles.cameraButton}
//           onPress={() => {
//             setFacing(current => (current === 'back' ? 'front' : 'back'));
//           }}
//         >
//           <Text style={styles.cameraButtonText}>Flip</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// // ============= Employee Home Screen =============
// function EmployeeHomeScreen() {
//   const [status, setStatus] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [capturing, setCapturing] = useState(false);
//   const [processing, setProcessing] = useState(false);

//   useEffect(() => {
//     loadStatus();
//     const interval = setInterval(loadStatus, 30000);
//     return () => clearInterval(interval);
//   }, []);

//   const loadStatus = async () => {
//     try {
//       const data = await ApiService.getStatus();
//       setStatus(data);
//     } catch (error) {
//       Alert.alert('Error', error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCheckIn = async (imageUri) => {
//     setCapturing(false);
//     setProcessing(true);

//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         throw new Error('Location permission denied');
//       }

//       const location = await Location.getCurrentPositionAsync({});
//       await ApiService.checkIn(
//         location.coords.latitude,
//         location.coords.longitude,
//         imageUri
//       );

//       Alert.alert('Success', 'Checked in successfully!');
//       loadStatus();
//     } catch (error) {
//       Alert.alert('Check-In Failed', error.message);
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const handleCheckOut = async (imageUri) => {
//     setCapturing(false);
//     setProcessing(true);

//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         throw new Error('Location permission denied');
//       }

//       const location = await Location.getCurrentPositionAsync({});
//       await ApiService.checkOut(
//         location.coords.latitude,
//         location.coords.longitude,
//         imageUri
//       );

//       Alert.alert('Success', 'Checked out successfully!');
//       loadStatus();
//     } catch (error) {
//       Alert.alert('Check-Out Failed', error.message);
//     } finally {
//       setProcessing(false);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <ActivityIndicator size="large" color="#007AFF" />
//       </View>
//     );
//   }

//   if (capturing) {
//     return (
//       <CameraCapture
//         onCapture={status?.checked_in ? handleCheckOut : handleCheckIn}
//         onCancel={() => setCapturing(false)}
//       />
//     );
//   }

//   return (
//     <ScrollView style={styles.container}>
//       <View style={styles.content}>
//         <View style={styles.statusCard}>
//           <Text style={styles.statusTitle}>Today's Status</Text>
//           <View style={styles.statusRow}>
//             <Text style={styles.statusLabel}>Check-In:</Text>
//             <Text style={[styles.statusValue, status?.checked_in && styles.statusActive]}>
//               {status?.checked_in ? status.check_in_time?.substring(11, 16) : 'Not checked in'}
//             </Text>
//           </View>
//           <View style={styles.statusRow}>
//             <Text style={styles.statusLabel}>Check-Out:</Text>
//             <Text style={[styles.statusValue, status?.checked_out && styles.statusActive]}>
//               {status?.checked_out ? status.check_out_time?.substring(11, 16) : 'Not checked out'}
//             </Text>
//           </View>
//         </View>

//         {processing ? (
//           <View style={styles.processingContainer}>
//             <ActivityIndicator size="large" color="#007AFF" />
//             <Text style={styles.processingText}>Processing...</Text>
//           </View>
//         ) : (
//           <>
//             {!status?.checked_in ? (
//               <TouchableOpacity
//                 style={[styles.actionButton, styles.checkInButton]}
//                 onPress={() => setCapturing(true)}
//               >
//                 <Text style={styles.actionButtonText}>Check In</Text>
//               </TouchableOpacity>
//             ) : !status?.checked_out ? (
//               <TouchableOpacity
//                 style={[styles.actionButton, styles.checkOutButton]}
//                 onPress={() => setCapturing(true)}
//               >
//                 <Text style={styles.actionButtonText}>Check Out</Text>
//               </TouchableOpacity>
//             ) : (
//               <View style={styles.completedContainer}>
//                 <Text style={styles.completedText}>✓ Attendance completed for today</Text>
//               </View>
//             )}
//           </>
//         )}

//         <View style={styles.infoCard}>
//           <Text style={styles.infoTitle}>Instructions</Text>
//           <Text style={styles.infoText}>• Ensure your face is clearly visible</Text>
//           <Text style={styles.infoText}>• Allow location access when prompted</Text>
//           <Text style={styles.infoText}>• Check in at the start of your shift</Text>
//           <Text style={styles.infoText}>• Check out at the end of your shift</Text>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

// // ============= Employee History Screen =============
// function EmployeeHistoryScreen() {
//   const [records, setRecords] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     loadRecords();
//   }, []);

//   const loadRecords = async () => {
//     try {
//       const data = await ApiService.getMyAttendance();
//       setRecords(data);
//     } catch (error) {
//       Alert.alert('Error', error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderRecord = ({ item }) => (
//     <View style={styles.recordCard}>
//       <Text style={styles.recordDate}>{item.date}</Text>
//       <View style={styles.recordRow}>
//         <Text style={styles.recordLabel}>Check-In:</Text>
//         <Text style={styles.recordValue}>
//           {item.check_in_time ? item.check_in_time.substring(11, 16) : 'N/A'}
//         </Text>
//       </View>
//       <View style={styles.recordRow}>
//         <Text style={styles.recordLabel}>Check-Out:</Text>
//         <Text style={styles.recordValue}>
//           {item.check_out_time ? item.check_out_time.substring(11, 16) : 'N/A'}
//         </Text>
//       </View>
//       {item.check_in_location && (
//         <Text style={styles.recordLocation}>
//           📍 {item.check_in_location.latitude.toFixed(6)}, {item.check_in_location.longitude.toFixed(6)}
//         </Text>
//       )}
//     </View>
//   );

//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <ActivityIndicator size="large" color="#007AFF" />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <FlatList
//         data={records}
//         renderItem={renderRecord}
//         keyExtractor={(item) => item.id.toString()}
//         contentContainerStyle={styles.listContainer}
//         ListEmptyComponent={
//           <Text style={styles.emptyText}>No attendance records found</Text>
//         }
//       />
//     </View>
//   );
// }

// // ============= Admin Register Employee Screen =============
// function AdminRegisterScreen() {
//   const [employeeId, setEmployeeId] = useState('');
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [role, setRole] = useState('employee');
//   const [capturedImage, setCapturedImage] = useState(null);
//   const [capturing, setCapturing] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const handleCapture = (uri) => {
//     setCapturedImage(uri);
//     setCapturing(false);
//   };

//   const handleRegister = async () => {
//     if (!employeeId || !name || !email || !password || !capturedImage) {
//       Alert.alert('Error', 'Please fill all fields and capture face image');
//       return;
//     }

//     setLoading(true);
//     try {
//       await ApiService.registerEmployee(
//         { employee_id: employeeId, name, email, password, role },
//         capturedImage
//       );
//       Alert.alert('Success', 'Employee registered successfully!');
//       setEmployeeId('');
//       setName('');
//       setEmail('');
//       setPassword('');
//       setCapturedImage(null);
//     } catch (error) {
//       Alert.alert('Registration Failed', error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (capturing) {
//     return (
//       <CameraCapture
//         onCapture={handleCapture}
//         onCancel={() => setCapturing(false)}
//       />
//     );
//   }

//   return (
//     <ScrollView style={styles.container}>
//       <View style={styles.content}>
//         <Text style={styles.sectionTitle}>Register New Employee</Text>

//         <TextInput
//           style={styles.input}
//           placeholder="Employee ID"
//           value={employeeId}
//           onChangeText={setEmployeeId}
//         />

//         <TextInput
//           style={styles.input}
//           placeholder="Full Name"
//           value={name}
//           onChangeText={setName}
//         />

//         <TextInput
//           style={styles.input}
//           placeholder="Email"
//           value={email}
//           onChangeText={setEmail}
//           autoCapitalize="none"
//           keyboardType="email-address"
//         />

//         <TextInput
//           style={styles.input}
//           placeholder="Password"
//           value={password}
//           onChangeText={setPassword}
//           secureTextEntry
//         />

//         <View style={styles.roleContainer}>
//           <Text style={styles.roleLabel}>Role:</Text>
//           <TouchableOpacity
//             style={[styles.roleButton, role === 'employee' && styles.roleButtonActive]}
//             onPress={() => setRole('employee')}
//           >
//             <Text style={[styles.roleButtonText, role === 'employee' && styles.roleButtonTextActive]}>
//               Employee
//             </Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.roleButton, role === 'admin' && styles.roleButtonActive]}
//             onPress={() => setRole('admin')}
//           >
//             <Text style={[styles.roleButtonText, role === 'admin' && styles.roleButtonTextActive]}>
//               Admin
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {capturedImage ? (
//           <View style={styles.imagePreviewContainer}>
//             <Image source={{ uri: capturedImage }} style={styles.imagePreview} />
//             <TouchableOpacity
//               style={styles.retakeButton}
//               onPress={() => setCapturing(true)}
//             >
//               <Text style={styles.retakeButtonText}>Retake Photo</Text>
//             </TouchableOpacity>
//           </View>
//         ) : (
//           <TouchableOpacity
//             style={styles.capturePhotoButton}
//             onPress={() => setCapturing(true)}
//           >
//             <Text style={styles.capturePhotoButtonText}>📷 Capture Face Photo</Text>
//           </TouchableOpacity>
//         )}

//         <TouchableOpacity
//           style={[styles.button, loading && styles.buttonDisabled]}
//           onPress={handleRegister}
//           disabled={loading}
//         >
//           {loading ? (
//             <ActivityIndicator color="#fff" />
//           ) : (
//             <Text style={styles.buttonText}>Register Employee</Text>
//           )}
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// }

// // ============= Admin Attendance Screen =============
// function AdminAttendanceScreen() {
//   const [records, setRecords] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

//   useEffect(() => {
//     loadRecords();
//   }, [selectedDate]);

//   const loadRecords = async () => {
//     setLoading(true);
//     try {
//       const data = await ApiService.getAttendance(selectedDate);
//       setRecords(data);
//     } catch (error) {
//       Alert.alert('Error', error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const openMap = (lat, lon) => {
//     const url = Platform.select({
//       ios: `maps:0,0?q=${lat},${lon}`,
//       android: `geo:0,0?q=${lat},${lon}`,
//     });
//     Alert.alert('Location', `Lat: ${lat.toFixed(6)}\nLon: ${lon.toFixed(6)}`);
//   };

//   const renderRecord = ({ item }) => (
//     <View style={styles.recordCard}>
//       <Text style={styles.recordName}>{item.name}</Text>
//       <Text style={styles.recordId}>ID: {item.employee_id}</Text>
//       <View style={styles.recordRow}>
//         <Text style={styles.recordLabel}>Check-In:</Text>
//         <Text style={styles.recordValue}>
//           {item.check_in_time ? item.check_in_time.substring(11, 16) : 'N/A'}
//         </Text>
//       </View>
//       {item.check_in_location && (
//         <TouchableOpacity
//           onPress={() => openMap(item.check_in_location.latitude, item.check_in_location.longitude)}
//         >
//           <Text style={styles.recordLocationLink}>
//             📍 View Check-In Location
//           </Text>
//         </TouchableOpacity>
//       )}
//       <View style={styles.recordRow}>
//         <Text style={styles.recordLabel}>Check-Out:</Text>
//         <Text style={styles.recordValue}>
//           {item.check_out_time ? item.check_out_time.substring(11, 16) : 'N/A'}
//         </Text>
//       </View>
//       {item.check_out_location && (
//         <TouchableOpacity
//           onPress={() => openMap(item.check_out_location.latitude, item.check_out_location.longitude)}
//         >
//           <Text style={styles.recordLocationLink}>
//             📍 View Check-Out Location
//           </Text>
//         </TouchableOpacity>
//       )}
//     </View>
//   );

//   return (
//     <View style={styles.container}>
//       <View style={styles.dateSelector}>
//         <Text style={styles.dateSelectorLabel}>Date: {selectedDate}</Text>
//         <TouchableOpacity
//           style={styles.todayButton}
//           onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
//         >
//           <Text style={styles.todayButtonText}>Today</Text>
//         </TouchableOpacity>
//       </View>
//       {loading ? (
//         <ActivityIndicator size="large" color="#007AFF" />
//       ) : (
//         <FlatList
//           data={records}
//           renderItem={renderRecord}
//           keyExtractor={(item) => item.id.toString()}
//           contentContainerStyle={styles.listContainer}
//           ListEmptyComponent={
//             <Text style={styles.emptyText}>No attendance records for this date</Text>
//           }
//         />
//       )}
//     </View>
//   );
// }

// // ============= Admin Employees Screen =============
// function AdminEmployeesScreen() {
//   const [employees, setEmployees] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     loadEmployees();
//   }, []);

//   const loadEmployees = async () => {
//     try {
//       const data = await ApiService.getEmployees();
//       setEmployees(data);
//     } catch (error) {
//       Alert.alert('Error', error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderEmployee = ({ item }) => (
//     <View style={styles.employeeCard}>
//       <Text style={styles.employeeName}>{item.name}</Text>
//       <Text style={styles.employeeDetail}>ID: {item.employee_id}</Text>
//       <Text style={styles.employeeDetail}>Email: {item.email}</Text>
//       <Text style={styles.employeeDetail}>Role: {item.role}</Text>
//       <Text style={styles.employeeDate}>
//         Registered: {item.created_at?.substring(0, 10)}
//       </Text>
//     </View>
//   );

//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <ActivityIndicator size="large" color="#007AFF" />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <FlatList
//         data={employees}
//         renderItem={renderEmployee}
//         keyExtractor={(item) => item.employee_id}
//         contentContainerStyle={styles.listContainer}
//         ListEmptyComponent={
//           <Text style={styles.emptyText}>No employees registered</Text>
//         }
//       />
//     </View>
//   );
// }

// // ============= Profile Screen =============
// function ProfileScreen({ navigation }) {
//   const [user, setUser] = useState(null);

//   useEffect(() => {
//     loadUser();
//   }, []);

//   const loadUser = async () => {
//     const userData = await AuthService.getUser();
//     setUser(userData);
//   };

//   const handleLogout = async () => {
//     Alert.alert('Logout', 'Are you sure you want to logout?', [
//       { text: 'Cancel', style: 'cancel' },
//       {
//         text: 'Logout',
//         onPress: async () => {
//           await AuthService.logout();
//           navigation.replace('Login');
//         },
//       },
//     ]);
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.content}>
//         <View style={styles.profileCard}>
//           <Text style={styles.profileName}>{user?.name}</Text>
//           <Text style={styles.profileDetail}>ID: {user?.id}</Text>
//           <Text style={styles.profileDetail}>Email: {user?.email}</Text>
//           <Text style={styles.profileDetail}>Role: {user?.role}</Text>
//         </View>

//         <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
//           <Text style={styles.logoutButtonText}>Logout</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// // ============= Tab Navigators =============

// function EmployeeTabs() {
//   return (
//     <Tab.Navigator
//       screenOptions={({ route }) => ({
//         tabBarActiveTintColor: '#007AFF',
//         tabBarInactiveTintColor: 'gray',
//         tabBarIcon: ({ focused, color, size }) => {
//           let iconName;

//           if (route.name === 'Home') {
//             iconName = focused ? 'home' : 'home-outline';
//           } else if (route.name === 'History') {
//             iconName = focused ? 'time' : 'time-outline';
//           } else if (route.name === 'Profile') {
//             iconName = focused ? 'person' : 'person-outline';
//           }

//           return <Ionicons name={iconName} size={size} color={color} />;
//         },
//       })}
//     >
//       <Tab.Screen name="Home" component={EmployeeHomeScreen} options={{ title: 'Attendance' }} />
//       <Tab.Screen name="History" component={EmployeeHistoryScreen} options={{ title: 'History' }} />
//       <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
//     </Tab.Navigator>
//   );
// }


// function AdminTabs() {
//   return (
//     <Tab.Navigator
//       screenOptions={({ route }) => ({
//         tabBarActiveTintColor: '#007AFF',
//         tabBarInactiveTintColor: 'gray',
//         tabBarIcon: ({ focused, color, size }) => {
//           let iconName;

//           if (route.name === 'Register') {
//             iconName = focused ? 'person-add' : 'person-add-outline';
//           } else if (route.name === 'Attendance') {
//             iconName = focused ? 'checkmark-done' : 'checkmark-done-outline';
//           } else if (route.name === 'Employees') {
//             iconName = focused ? 'people' : 'people-outline';
//           } else if (route.name === 'Profile') {
//             iconName = focused ? 'person' : 'person-outline';
//           }

//           return <Ionicons name={iconName} size={size} color={color} />;
//         },
//       })}
//     >
//       <Tab.Screen name="Register" component={AdminRegisterScreen} options={{ title: 'Register' }} />
//       <Tab.Screen name="Attendance" component={AdminAttendanceScreen} options={{ title: 'Attendance' }} />
//       <Tab.Screen name="Employees" component={AdminEmployeesScreen} options={{ title: 'Employees' }} />
//       <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
//     </Tab.Navigator>
//   );
// }

// // ============= Main App =============
// export default function App() {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator screenOptions={{ headerShown: false }}>
//         <Stack.Screen name="Login" component={LoginScreen} />
//         <Stack.Screen name="EmployeeTabs" component={EmployeeTabs} />
//         <Stack.Screen name="AdminTabs" component={AdminTabs} />
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }

// // ============= Styles =============
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F5F5F5',
//   },
//   content: {
//     padding: 20,
//   },
//   loginContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     padding: 30,
//     backgroundColor: '#FFFFFF',
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: 'bold',
//     color: '#007AFF',
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#666',
//     marginBottom: 40,
//     textAlign: 'center',
//   },
//   input: {
//     backgroundColor: '#F8F8F8',
//     borderRadius: 10,
//     padding: 15,
//     marginBottom: 15,
//     fontSize: 16,
//     borderWidth: 1,
//     borderColor: '#E0E0E0',
//   },
//   button: {
//     backgroundColor: '#007AFF',
//     borderRadius: 10,
//     padding: 16,
//     alignItems: 'center',
//     marginTop: 10,
//   },
//   buttonDisabled: {
//     backgroundColor: '#CCCCCC',
//   },
//   buttonText: {
//     color: '#FFFFFF',
//     fontSize: 18,
//     fontWeight: '600',
//   },
//   statusCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 15,
//     padding: 20,
//     marginBottom: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   statusTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 15,
//   },
//   statusRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 10,
//   },
//   statusLabel: {
//     fontSize: 16,
//     color: '#666',
//   },
//   statusValue: {
//     fontSize: 16,
//     color: '#999',
//   },
//   statusActive: {
//     color: '#34C759',
//     fontWeight: '600',
//   },
//   actionButton: {
//     borderRadius: 15,
//     padding: 20,
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   checkInButton: {
//     backgroundColor: '#34C759',
//   },
//   checkOutButton: {
//     backgroundColor: '#FF3B30',
//   },
//   actionButtonText: {
//     color: '#FFFFFF',
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   processingContainer: {
//     alignItems: 'center',
//     paddingVertical: 40,
//   },
//   processingText: {
//     marginTop: 15,
//     fontSize: 16,
//     color: '#666',
//   },
//   completedContainer: {
//     backgroundColor: '#E8F5E9',
//     borderRadius: 15,
//     padding: 20,
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   completedText: {
//     fontSize: 18,
//     color: '#34C759',
//     fontWeight: '600',
//   },
//   infoCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 15,
//     padding: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   infoTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 12,
//   },
//   infoText: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 8,
//   },
//   cameraContainer: {
//     flex: 1,
//   },
//   camera: {
//     flex: 1,
//   },
//   cameraOverlay: {
//     flex: 1,
//     backgroundColor: 'transparent',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   faceGuide: {
//     width: 250,
//     height: 300,
//     borderWidth: 3,
//     borderColor: '#FFFFFF',
//     borderRadius: 150,
//     backgroundColor: 'transparent',
//   },
//   cameraButtons: {
//     flexDirection: 'row',
//     backgroundColor: '#000',
//     justifyContent: 'space-around',
//     alignItems: 'center',
//     paddingVertical: 20,
//   },
//   cameraButton: {
//     padding: 15,
//   },
//   cameraButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   captureButton: {
//     width: 70,
//     height: 70,
//     borderRadius: 35,
//     backgroundColor: '#FFFFFF',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 5,
//     borderColor: '#007AFF',
//   },
//   captureButtonInner: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#007AFF',
//   },
//   listContainer: {
//     padding: 15,
//   },
//   recordCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     padding: 15,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     elevation: 2,
//   },
//   recordDate: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#007AFF',
//     marginBottom: 8,
//   },
//   recordName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 4,
//   },
//   recordId: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 8,
//   },
//   recordRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 5,
//   },
//   recordLabel: {
//     fontSize: 14,
//     color: '#666',
//   },
//   recordValue: {
//     fontSize: 14,
//     color: '#333',
//     fontWeight: '500',
//   },
//   recordLocation: {
//     fontSize: 12,
//     color: '#999',
//     marginTop: 8,
//   },
//   recordLocationLink: {
//     fontSize: 14,
//     color: '#007AFF',
//     marginTop: 5,
//     textDecorationLine: 'underline',
//   },
//   emptyText: {
//     textAlign: 'center',
//     color: '#999',
//     fontSize: 16,
//     marginTop: 40,
//   },
//   sectionTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 20,
//   },
//   roleContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 15,
//   },
//   roleLabel: {
//     fontSize: 16,
//     color: '#666',
//     marginRight: 15,
//   },
//   roleButton: {
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#007AFF',
//     marginRight: 10,
//   },
//   roleButtonActive: {
//     backgroundColor: '#007AFF',
//   },
//   roleButtonText: {
//     color: '#007AFF',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   roleButtonTextActive: {
//     color: '#FFFFFF',
//   },
//   capturePhotoButton: {
//     backgroundColor: '#007AFF',
//     borderRadius: 12,
//     padding: 20,
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   capturePhotoButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   imagePreviewContainer: {
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   imagePreview: {
//     width: 200,
//     height: 200,
//     borderRadius: 100,
//     marginBottom: 15,
//   },
//   retakeButton: {
//     backgroundColor: '#FF9500',
//     borderRadius: 8,
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//   },
//   retakeButtonText: {
//     color: '#FFFFFF',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   dateSelector: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//     padding: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E0E0E0',
//   },
//   dateSelectorLabel: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//   },
//   todayButton: {
//     backgroundColor: '#007AFF',
//     borderRadius: 8,
//     paddingHorizontal: 15,
//     paddingVertical: 8,
//   },
//   todayButtonText: {
//     color: '#FFFFFF',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   employeeCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     padding: 15,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     elevation: 2,
//   },
//   employeeName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 6,
//   },
//   employeeDetail: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 4,
//   },
//   employeeDate: {
//     fontSize: 12,
//     color: '#999',
//     marginTop: 6,
//   },
//   profileCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 15,
//     padding: 25,
//     marginBottom: 30,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   profileName: {
//     fontSize: 26,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 15,
//     textAlign: 'center',
//   },
//   profileDetail: {
//     fontSize: 16,
//     color: '#666',
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   logoutButton: {
//     backgroundColor: '#FF3B30',
//     borderRadius: 12,
//     padding: 16,
//     alignItems: 'center',
//   },
//   logoutButtonText: {
//     color: '#FFFFFF',
//     fontSize: 18,
//     fontWeight: '600',
//   },
// });



import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  FlatList,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';

const API_URL = 'https://attappv2.duckdns.org';
// const API_URL = 'http://0.0.0.0:8000'
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

// ============= Authentication Service =============
const AuthService = {
  async login(email, password) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Login failed');
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.employee));
    return data;
  },

  async logout() {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },

  async getToken() {
    return await AsyncStorage.getItem('token');
  },

  async getUser() {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};

// ============= Enhanced API Service =============
const ApiService = {
  async checkIn(latitude, longitude, imageUri) {
    const token = await AuthService.getToken();
    const formData = new FormData();
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    if (imageUri.startsWith('data:image/')) {
      console.log('Sending base64 image, total length:', imageUri.length);
      // Send the complete base64 string
      formData.append('face_image_base64', imageUri);
    } else {
      console.log('Sending file URI:', imageUri);
      formData.append('face_image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'face.jpg',
      });
    }
    // formData.append('face_image', {
    //   uri: imageUri,
    //   type: 'image/jpeg',
    //   name: 'face.jpg',
    // });

    const response = await fetch(`${API_URL}/api/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Check-in failed');
    return data;
  },

  async checkOut(latitude, longitude, imageUri) {
    const token = await AuthService.getToken();
    const formData = new FormData();
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    if (imageUri.startsWith('data:image/')) {
      console.log('Sending base64 image, total length:', imageUri.length);
      // Send the complete base64 string
      formData.append('face_image_base64', imageUri);
    } else {
      console.log('Sending file URI:', imageUri);
      formData.append('face_image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'face.jpg',
      });
    }
    // formData.append('face_image', {
    //   uri: imageUri,
    //   type: 'image/jpeg',
    //   name: 'face.jpg',
    // });

    const response = await fetch(`${API_URL}/api/attendance/check-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Check-out failed');
    return data;
  },

  async getStatus() {
    const token = await AuthService.getToken();
    const response = await fetch(`${API_URL}/api/employee/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Failed to fetch status');
    return data;
  },

  async getMyAttendance(page = 1, limit = 30) {
    const token = await AuthService.getToken();
    const response = await fetch(
      `${API_URL}/api/employee/my-attendance?page=${page}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (!response.ok) throw new Error('Failed to fetch attendance');
    return data;
  },

  async getProfile() {
    const token = await AuthService.getToken();
    const response = await fetch(`${API_URL}/api/employee/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Failed to fetch profile');
    return data;
  },

  // async registerEmployee(employeeData, imageUri) {
  //   const token = await AuthService.getToken();
  //   const formData = new FormData();
  //   let fileUri = imageUri;

  //   formData.append('employee_id', employeeData.employee_id);
  //   formData.append('name', employeeData.name);
  //   formData.append('email', employeeData.email);
  //   formData.append('password', employeeData.password);
  //   formData.append('role', employeeData.role);
  //   console.log('Image URI before upload:', fileUri);
    

  //   formData.append('face_image', {
  //     uri: fileUri,
  //     type: 'image/jpeg',
  //     name: 'face.jpg',
  //   });

  //   const response = await fetch(`${API_URL}/api/admin/register-employee`, {
  //     method: 'POST',
  //     headers: { Authorization: `Bearer ${token}` },
  //     body: formData,
  //   });

  //   const data = await response.json();
  //   if (!response.ok) throw new Error(data.detail || 'Registration failed');
  //   return data;
  // },
async registerEmployee(employeeData, imageUri) {
  try {
    const token = await AuthService.getToken();
    const formData = new FormData();
    
    formData.append('employee_id', employeeData.employee_id);
    formData.append('name', employeeData.name);
    formData.append('email', employeeData.email);
    formData.append('password', employeeData.password);
    formData.append('role', employeeData.role);
    
    if (imageUri.startsWith('data:image/')) {
      console.log('Sending base64 image, total length:', imageUri.length);
      // Send the complete base64 string
      formData.append('face_image_base64', imageUri);
    } else {
      console.log('Sending file URI:', imageUri);
      formData.append('face_image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'face.jpg',
      });
    }
    
    console.log('Making request to:', `${API_URL}/api/admin/register-employee`);
    
    const response = await fetch(`${API_URL}/api/admin/register-employee`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (!response.ok) {
      throw new Error(data.detail || 'Registration failed');
    }
    
    return data;
  } catch (error) {
    console.error('Full registration error:', error);
    throw new Error(`Failed to register employee: ${error.message}`);
  }
},
  async getAttendance(date = null, employeeId = null, page = 1, limit = 50) {
    const token = await AuthService.getToken();
    let url = `${API_URL}/api/admin/attendance?page=${page}&limit=${limit}`;
    if (date) url += `&date=${date}`;
    if (employeeId) url += `&employee_id=${employeeId}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Failed to fetch attendance');
    return data;
  },

  async getEmployees(page = 1, limit = 50) {
    const token = await AuthService.getToken();
    const response = await fetch(
      `${API_URL}/api/admin/employees?page=${page}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (!response.ok) throw new Error('Failed to fetch employees');
    return data;
  },

  async getAnalytics(startDate = null, endDate = null) {
    const token = await AuthService.getToken();
    let url = `${API_URL}/api/admin/analytics?`;
    if (startDate) url += `start_date=${startDate}&`;
    if (endDate) url += `end_date=${endDate}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return data;
  },

  async updateEmployeeStatus(employeeId, isActive) {
    const token = await AuthService.getToken();
    const response = await fetch(
      `${API_URL}/api/admin/employees/${employeeId}/status?is_active=${isActive}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();
    if (!response.ok) throw new Error('Failed to update employee status');
    return data;
  },

  async getSettings() {
  const token = await AuthService.getToken();
  const response = await fetch(`${API_URL}/api/admin/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error('Failed to fetch settings');
  return data;
},

async updateSettings(settings) {
  const token = await AuthService.getToken();
  const response = await fetch(`${API_URL}/api/admin/settings/bulk-update`, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to update settings');
  return data;
},
};

// ============= Camera Capture Component =============
function CameraCapture({ onCapture, onCancel }) {
  const [facing, setFacing] = useState('front');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      onCapture(photo.uri);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={80} color="#ccc" />
        <Text style={styles.permissionText}>Camera access is required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.cameraOverlay}>
          <View style={styles.faceGuide}>
            <Text style={styles.faceGuideText}>Position your face in the frame</Text>
          </View>
        </View>
      </CameraView>
      <View style={styles.cameraButtons}>
        <TouchableOpacity style={styles.cameraButton} onPress={onCancel}>
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
        >
          <Ionicons name="camera-reverse" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============= Date Picker Component =============
function DatePickerButton({ date, onDateChange, label = 'Select Date' }) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(new Date(date));

  const onChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        onDateChange(selectedDate.toISOString().split('T')[0]);
      }
    }
  };

  const handleConfirm = () => {
    onDateChange(tempDate.toISOString().split('T')[0]);
    setShow(false);
  };

  return (
    <View>
      <TouchableOpacity style={styles.datePickerButton} onPress={() => setShow(true)}>
        <Ionicons name="calendar-outline" size={20} color="#007AFF" />
        <Text style={styles.datePickerText}>{date}</Text>
      </TouchableOpacity>

      {show && (
        <>
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChange}
            maximumDate={new Date()}
          />
          {Platform.OS === 'ios' && (
            <View style={styles.datePickerActions}>
              <TouchableOpacity onPress={() => setShow(false)}>
                <Text style={styles.datePickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={styles.datePickerConfirm}>Confirm</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ============= Login Screen =============
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const data = await AuthService.login(email, password);
      if (data.employee.role === 'admin') {
        navigation.replace('AdminTabs');
      } else {
        navigation.replace('EmployeeTabs');
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.loginContainer}>
        <View style={styles.logoContainer}>
          <Ionicons name="finger-print" size={80} color="#007AFF" />
          <Text style={styles.title}>Attendance System</Text>
          <Text style={styles.subtitle}>Facial Recognition Technology</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#999"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.loginFooter}>
          <Text style={styles.footerText}>Powered by Face Recognition AI</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ============= Employee Home Screen =============
function EmployeeHomeScreen() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const data = await ApiService.getStatus();
      setStatus(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStatus();
  };

  const handleCheckIn = async (imageUri) => {
    console.log(imageUri)
    setCapturing(false);
    setProcessing(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission is required for attendance');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const result = await ApiService.checkIn(
        location.coords.latitude,
        location.coords.longitude,
        imageUri
      );

      Alert.alert(
        'Success! ✓',
        `Checked in at ${new Date(result.time).toLocaleTimeString()}\n${result.location.validation}\nConfidence: ${(result.confidence * 100).toFixed(1)}%`,
        [{ text: 'OK' }]
      );
      loadStatus();
    } catch (error) {
      Alert.alert('Check-In Failed', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOut = async (imageUri) => {
    setCapturing(false);
    setProcessing(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission is required for attendance');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const result = await ApiService.checkOut(
        location.coords.latitude,
        location.coords.longitude,
        imageUri
      );

      Alert.alert(
        'Success! ✓',
        `Checked out at ${new Date(result.time).toLocaleTimeString()}\n${result.location.validation}\nConfidence: ${(result.confidence * 100).toFixed(1)}%`,
        [{ text: 'OK' }]
      );
      loadStatus();
    } catch (error) {
      Alert.alert('Check-Out Failed', error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading status...</Text>
      </View>
    );
  }

  if (capturing) {
    return (
      <CameraCapture
        onCapture={status?.checked_in ? handleCheckOut : handleCheckIn}
        onCancel={() => setCapturing(false)}
      />
    );
  }

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.currentTime}>{currentTime}</Text>
          <Text style={styles.currentDate}>{currentDate}</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Today's Attendance</Text>
            <View
              style={[
                styles.statusBadge,
                status?.status === 'completed' && styles.statusBadgeComplete,
                status?.status === 'checked_in' && styles.statusBadgeActive,
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {status?.status === 'completed' ? 'Completed' : status?.checked_in ? 'Active' : 'Pending'}
              </Text>
            </View>
          </View>

          <View style={styles.timelineContainer}>
            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineDot,
                  status?.checked_in && styles.timelineDotActive,
                ]}
              >
                <Ionicons
                  name={status?.checked_in ? 'checkmark' : 'time-outline'}
                  size={16}
                  color={status?.checked_in ? '#fff' : '#ccc'}
                />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Check-In</Text>
                <Text
                  style={[
                    styles.timelineValue,
                    status?.checked_in && styles.timelineValueActive,
                  ]}
                >
                  {status?.checked_in
                    ? new Date(status.check_in_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Not checked in'}
                </Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineDot,
                  status?.checked_out && styles.timelineDotActive,
                ]}
              >
                <Ionicons
                  name={status?.checked_out ? 'checkmark' : 'time-outline'}
                  size={16}
                  color={status?.checked_out ? '#fff' : '#ccc'}
                />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Check-Out</Text>
                <Text
                  style={[
                    styles.timelineValue,
                    status?.checked_out && styles.timelineValueActive,
                  ]}
                >
                  {status?.checked_out
                    ? new Date(status.check_out_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Not checked out'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {processing ? (
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingText}>Processing...</Text>
            <Text style={styles.processingSubtext}>Verifying your identity</Text>
          </View>
        ) : (
          <>
            {!status?.checked_in ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.checkInButton]}
                onPress={() => setCapturing(true)}
              >
                <Ionicons name="log-in-outline" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Check In</Text>
              </TouchableOpacity>
            ) : !status?.checked_out ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.checkOutButton]}
                onPress={() => setCapturing(true)}
              >
                <Ionicons name="log-out-outline" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Check Out</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.completedCard}>
                <Ionicons name="checkmark-circle" size={60} color="#34C759" />
                <Text style={styles.completedTitle}>All Done!</Text>
                <Text style={styles.completedText}>
                  Attendance completed for today
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.infoTitle}>Important Notes</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#34C759" />
            <Text style={styles.infoText}>Position your face clearly in the frame</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#34C759" />
            <Text style={styles.infoText}>Enable location services when prompted</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#34C759" />
            <Text style={styles.infoText}>Check in within office premises</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#34C759" />
            <Text style={styles.infoText}>Follow your shift timings</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ============= Employee History Screen =============
function EmployeeHistoryScreen() {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadRecords();
  }, [page]);

  const loadRecords = async () => {
    try {
      const data = await ApiService.getMyAttendance(page, 30);
      setRecords(data.records);
      setPagination(data.pagination);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadRecords();
  };

  const loadMore = () => {
    if (pagination && page < pagination.pages) {
      setPage(page + 1);
    }
  };

  const getStatusColor = (record) => {
    if (record.status === 'completed') return '#34C759';
    if (record.status === 'checked_in') return '#FF9500';
    return '#8E8E93';
  };

  const getStatusIcon = (record) => {
    if (record.status === 'completed') return 'checkmark-done-circle';
    if (record.status === 'checked_in') return 'time';
    return 'remove-circle-outline';
  };

  const renderRecord = ({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View>
          <Text style={styles.historyDate}>
            {new Date(item.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <Text style={styles.historyYear}>
            {new Date(item.date).getFullYear()}
          </Text>
        </View>
        <View style={[styles.historyStatusBadge, { backgroundColor: getStatusColor(item) }]}>
          <Ionicons name={getStatusIcon(item)} size={16} color="#fff" />
          <Text style={styles.historyStatusText}>
            {item.status === 'completed' ? 'Complete' : item.status === 'checked_in' ? 'Pending' : 'Incomplete'}
          </Text>
        </View>
      </View>

      <View style={styles.historyTimes}>
        <View style={styles.historyTimeItem}>
          <Ionicons name="log-in-outline" size={20} color="#007AFF" />
          <View style={styles.historyTimeContent}>
            <Text style={styles.historyTimeLabel}>Check-In</Text>
            <Text style={styles.historyTimeValue}>
              {item.check_in_time
                ? new Date(item.check_in_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'N/A'}
            </Text>
            {item.check_in_confidence && (
              <Text style={styles.confidenceText}>
                {(item.check_in_confidence * 100).toFixed(1)}% match
              </Text>
            )}
          </View>
        </View>

        <View style={styles.historyDivider} />

        <View style={styles.historyTimeItem}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <View style={styles.historyTimeContent}>
            <Text style={styles.historyTimeLabel}>Check-Out</Text>
            <Text style={styles.historyTimeValue}>
              {item.check_out_time
                ? new Date(item.check_out_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'N/A'}
            </Text>
            {item.check_out_confidence && (
              <Text style={styles.confidenceText}>
                {(item.check_out_confidence * 100).toFixed(1)}% match
              </Text>
            )}
          </View>
        </View>
      </View>

      {item.check_in_location && (
        <View style={styles.locationInfo}>
          <Ionicons name="location-outline" size={16} color="#8E8E93" />
          <Text style={styles.locationText}>
            Location verified
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {pagination && (
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Page {pagination.page} of {pagination.pages} • {pagination.total} records
          </Text>
        </View>
      )}
      <FlatList
        data={records}
        renderItem={renderRecord}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No attendance records yet</Text>
            <Text style={styles.emptySubtext}>Your attendance history will appear here</Text>
          </View>
        }
        ListFooterComponent={
          page < (pagination?.pages || 1) && (
            <ActivityIndicator size="small" color="#007AFF" style={styles.footerLoader} />
          )
        }
      />
    </View>
  );
}

// ============= Admin Register Employee Screen =============
function AdminRegisterScreen() {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleCapture = (uri) => {
    console.log('Captured URI type:', uri.startsWith('data:') ? 'base64' : 'file');
    console.log('Captured URI:', uri.substring(0, 100));
    setCapturedImage(uri);
    setCapturing(false);
  };

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain uppercase letter';
    if (!/[a-z]/.test(pwd)) return 'Password must contain lowercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain a digit';
    return null;
  };

  const handleRegister = async () => {
    if (!employeeId || !name || !email || !password || !capturedImage) {
      Alert.alert('Error', 'Please fill all fields and capture face image');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Invalid Password', passwordError);
      return;
    }

    setLoading(true);
    try {
      await ApiService.registerEmployee(
        { employee_id: employeeId, name, email, password, role },
        capturedImage
      );
      Alert.alert('Success', 'Employee registered successfully!', [
        { text: 'OK', onPress: () => {
          setEmployeeId('');
          setName('');
          setEmail('');
          setPassword('');
          setRole('employee');
          setCapturedImage(null);
        }}
      ]);
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (capturing) {
    return (
      <CameraCapture onCapture={handleCapture} onCancel={() => setCapturing(false)} />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.formHeader}>
          <Ionicons name="person-add" size={32} color="#007AFF" />
          <Text style={styles.formTitle}>Register New Employee</Text>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="id-card-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder="Employee ID"
            value={employeeId}
            onChangeText={setEmployeeId}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder="Password (min 8 chars)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.roleSection}>
          <Text style={styles.roleLabel}>Role</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'employee' && styles.roleButtonActive]}
              onPress={() => setRole('employee')}
            >
              <Ionicons
                name={role === 'employee' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={role === 'employee' ? '#007AFF' : '#8E8E93'}
              />
              <Text
                style={[
                  styles.roleButtonText,
                  role === 'employee' && styles.roleButtonTextActive,
                ]}
              >
                Employee
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'admin' && styles.roleButtonActive]}
              onPress={() => setRole('admin')}
            >
              <Ionicons
                name={role === 'admin' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={role === 'admin' ? '#007AFF' : '#8E8E93'}
              />
              <Text
                style={[styles.roleButtonText, role === 'admin' && styles.roleButtonTextActive]}
              >
                Admin
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.faceSection}>
          <Text style={styles.faceSectionTitle}>Face Recognition Photo</Text>
          {capturedImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: capturedImage }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => setCapturing(true)}
              >
                <Ionicons name="camera-outline" size={20} color="#007AFF" />
                <Text style={styles.retakeButtonText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.capturePhotoButton}
              onPress={() => setCapturing(true)}
            >
              <Ionicons name="camera" size={32} color="#007AFF" />
              <Text style={styles.capturePhotoButtonText}>Capture Face Photo</Text>
              <Text style={styles.capturePhotoSubtext}>
                Ensure face is clearly visible
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Register Employee</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ============= Admin Attendance Screen =============
function AdminAttendanceScreen() {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [employeeIdFilter, setEmployeeIdFilter] = useState('');

  useEffect(() => {
    loadRecords();
  }, [selectedDate, page]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getAttendance(selectedDate, employeeIdFilter || null, page, 50);
      setRecords(data.records);
      setPagination(data.pagination);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadRecords();
  };

  const applyFilter = () => {
    setPage(1);
    setFilterModalVisible(false);
    loadRecords();
  };

  const clearFilter = () => {
    setEmployeeIdFilter('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setPage(1);
    setFilterModalVisible(false);
    loadRecords();
  };

  const renderRecord = ({ item }) => (
    <View style={styles.adminRecordCard}>
      <View style={styles.adminRecordHeader}>
        <View style={styles.adminRecordInfo}>
          <Text style={styles.adminRecordName}>{item.name}</Text>
          <Text style={styles.adminRecordId}>ID: {item.employee_id}</Text>
          <Text style={styles.adminRecordEmail}>{item.email}</Text>
        </View>
        <View
          style={[
            styles.adminStatusBadge,
            {
              backgroundColor:
                item.status === 'completed'
                  ? '#34C759'
                  : item.status === 'checked_in'
                  ? '#FF9500'
                  : '#8E8E93',
            },
          ]}
        >
          <Text style={styles.adminStatusText}>
            {item.status === 'completed' ? 'Complete' : item.status === 'checked_in' ? 'Active' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.adminRecordDetails}>
        <View style={styles.adminRecordRow}>
          <View style={styles.adminRecordItem}>
            <Ionicons name="log-in" size={18} color="#007AFF" />
            <View style={styles.adminRecordItemContent}>
              <Text style={styles.adminRecordLabel}>Check-In</Text>
              <Text style={styles.adminRecordValue}>
                {item.check_in_time
                  ? new Date(item.check_in_time).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </Text>
              {item.check_in_confidence && (
                <Text style={styles.adminConfidenceText}>
                  {(item.check_in_confidence * 100).toFixed(1)}%
                </Text>
              )}
            </View>
          </View>

          <View style={styles.adminRecordItem}>
            <Ionicons name="log-out" size={18} color="#FF3B30" />
            <View style={styles.adminRecordItemContent}>
              <Text style={styles.adminRecordLabel}>Check-Out</Text>
              <Text style={styles.adminRecordValue}>
                {item.check_out_time
                  ? new Date(item.check_out_time).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </Text>
              {item.check_out_confidence && (
                <Text style={styles.adminConfidenceText}>
                  {(item.check_out_confidence * 100).toFixed(1)}%
                </Text>
              )}
            </View>
          </View>
        </View>

        {(item.check_in_location || item.check_out_location) && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#8E8E93" />
            <Text style={styles.locationText}>Location verified</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.adminHeader}>
        <View style={styles.dateFilterContainer}>
          <DatePickerButton
            date={selectedDate}
            onDateChange={(date) => {
              setSelectedDate(date);
              setPage(1);
            }}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="filter" size={20} color="#007AFF" />
            {employeeIdFilter && <View style={styles.filterIndicator} />}
          </TouchableOpacity>
        </View>
        {pagination && (
          <Text style={styles.recordCount}>
            {pagination.total} record{pagination.total !== 1 ? 's' : ''} • Page {pagination.page} of {pagination.pages}
          </Text>
        )}
      </View>

      {loading && page === 1 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderRecord}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={() => {
            if (pagination && page < pagination.pages) {
              setPage(page + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No attendance records</Text>
              <Text style={styles.emptySubtext}>
                {employeeIdFilter
                  ? 'Try adjusting your filters'
                  : 'No records for this date'}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Attendance</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.filterLabel}>Employee ID</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="id-card-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="Enter employee ID"
                  value={employeeIdFilter}
                  onChangeText={setEmployeeIdFilter}
                  placeholderTextColor="#999"
                />
              </View>

              <Text style={styles.filterLabel}>Date</Text>
              <DatePickerButton date={selectedDate} onDateChange={setSelectedDate} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={clearFilter}>
                <Text style={styles.modalButtonSecondaryText}>Clear Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={applyFilter}>
                <Text style={styles.modalButtonPrimaryText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
//==============Admin settings screen=================
function AdminSettingsScreen() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await ApiService.getSettings();
      const settingsMap = {};
      data.settings.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await ApiService.updateSettings(settings);
      Alert.alert('Success', 'Settings updated successfully!');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Office Location</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Latitude</Text>
          <TextInput
            style={styles.input}
            value={settings.office_latitude}
            onChangeText={(val) => setSettings({...settings, office_latitude: val})}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Longitude</Text>
          <TextInput
            style={styles.input}
            value={settings.office_longitude}
            onChangeText={(val) => setSettings({...settings, office_longitude: val})}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Radius (km)</Text>
          <TextInput
            style={styles.input}
            value={settings.office_radius_km}
            onChangeText={(val) => setSettings({...settings, office_radius_km: val})}
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={styles.sectionTitle}>Check-in Hours</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Start Time (HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={settings.check_in_start_time}
            onChangeText={(val) => setSettings({...settings, check_in_start_time: val})}
            placeholder="07:00"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>End Time (HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={settings.check_in_end_time}
            onChangeText={(val) => setSettings({...settings, check_in_end_time: val})}
            placeholder="10:00"
          />
        </View>

        <Text style={styles.sectionTitle}>Check-out Hours</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Start Time (HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={settings.check_out_start_time}
            onChangeText={(val) => setSettings({...settings, check_out_start_time: val})}
            placeholder="16:00"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>End Time (HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={settings.check_out_end_time}
            onChangeText={(val) => setSettings({...settings, check_out_end_time: val})}
            placeholder="20:00"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
// ============= Admin Employees Screen =============
function AdminEmployeesScreen() {
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadEmployees();
  }, [page]);

  const loadEmployees = async () => {
    try {
      const data = await ApiService.getEmployees(page, 50);
      setEmployees(data.employees);
      setPagination(data.pagination);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadEmployees();
  };

  const handleToggleStatus = (employee) => {
    Alert.alert(
      `${employee.is_active ? 'Deactivate' : 'Activate'} Employee`,
      `Are you sure you want to ${employee.is_active ? 'deactivate' : 'activate'} ${employee.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await ApiService.updateEmployeeStatus(employee.employee_id, !employee.is_active);
              Alert.alert('Success', `Employee ${employee.is_active ? 'deactivated' : 'activated'} successfully`);
              loadEmployees();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderEmployee = ({ item }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View style={styles.employeeAvatar}>
          <Text style={styles.employeeAvatarText}>
            {item.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </Text>
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.name}</Text>
          <Text style={styles.employeeId}>ID: {item.employee_id}</Text>
        </View>
        <View
          style={[
            styles.employeeStatusBadge,
            { backgroundColor: item.is_active ? '#34C759' : '#8E8E93' },
          ]}
        >
          <Text style={styles.employeeStatusText}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.employeeDetails}>
        <View style={styles.employeeDetailRow}>
          <Ionicons name="mail-outline" size={16} color="#8E8E93" />
          <Text style={styles.employeeDetailText}>{item.email}</Text>
        </View>
        <View style={styles.employeeDetailRow}>
          <Ionicons name="shield-outline" size={16} color="#8E8E93" />
          <Text style={styles.employeeDetailText}>
            {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
          </Text>
        </View>
        <View style={styles.employeeDetailRow}>
          <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
          <Text style={styles.employeeDetailText}>
            Joined {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.employeeActionButton}
        onPress={() => handleToggleStatus(item)}
      >
        <Ionicons
          name={item.is_active ? 'remove-circle-outline' : 'checkmark-circle-outline'}
          size={20}
          color={item.is_active ? '#FF3B30' : '#34C759'}
        />
        <Text
          style={[
            styles.employeeActionText,
            { color: item.is_active ? '#FF3B30' : '#34C759' },
          ]}
        >
          {item.is_active ? 'Deactivate' : 'Activate'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading employees...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {pagination && (
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            {pagination.total} employee{pagination.total !== 1 ? 's' : ''} • Page {pagination.page} of {pagination.pages}
          </Text>
        </View>
      )}
      <FlatList
        data={employees}
        renderItem={renderEmployee}
        keyExtractor={(item) => item.employee_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (pagination && page < pagination.pages) {
            setPage(page + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No employees found</Text>
          </View>
        }
      />
    </View>
  );
}

// ============= Admin Analytics Screen =============
function AdminAnalyticsScreen() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getAnalytics(startDate, endDate);
      setAnalytics(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.analyticsHeader}>
          <Text style={styles.analyticsTitle}>Analytics Dashboard</Text>
          <View style={styles.analyticsDateRange}>
            <DatePickerButton date={startDate} onDateChange={setStartDate} label="From" />
            <Text style={styles.dateRangeSeparator}>to</Text>
            <DatePickerButton date={endDate} onDateChange={setEndDate} label="To" />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-done-circle" size={32} color="#34C759" />
            <Text style={styles.statValue}>{analytics?.total_records || 0}</Text>
            <Text style={styles.statLabel}>Total Records</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={32} color="#007AFF" />
            <Text style={styles.statValue}>{analytics?.complete_days || 0}</Text>
            <Text style={styles.statLabel}>Complete Days</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time" size={32} color="#FF9500" />
            <Text style={styles.statValue}>{analytics?.incomplete_days || 0}</Text>
            <Text style={styles.statLabel}>Incomplete Days</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="star" size={32} color="#FF3B30" />
            <Text style={styles.statValue}>
              {((analytics?.average_confidence?.check_in || 0) * 100).toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Avg Confidence</Text>
          </View>
        </View>

        <View style={styles.topEmployeesCard}>
          <Text style={styles.sectionTitle}>Top Attendance</Text>
          {analytics?.top_employees && analytics.top_employees.length > 0 ? (
            analytics.top_employees.map((emp, index) => (
              <View key={emp.employee_id} style={styles.topEmployeeItem}>
                <View style={styles.topEmployeeRank}>
                  <Text style={styles.topEmployeeRankText}>{index + 1}</Text>
                </View>
                <View style={styles.topEmployeeInfo}>
                  <Text style={styles.topEmployeeName}>{emp.name}</Text>
                  <Text style={styles.topEmployeeId}>{emp.employee_id}</Text>
                </View>
                <View style={styles.topEmployeeDays}>
                  <Text style={styles.topEmployeeDaysText}>{emp.attendance_days}</Text>
                  <Text style={styles.topEmployeeDaysLabel}>days</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No data available</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ============= Enhanced Profile Screen =============
function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userData = await AuthService.getUser();
      setUser(userData);

      if (userData.role !== 'admin') {
        const profileData = await ApiService.getProfile();
        setProfile(profileData);
      }
    } catch (error) {
      console.log('Profile load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AuthService.logout();
          navigation.replace('Login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.name}</Text>
          <View
            style={[
              styles.profileRoleBadge,
              { backgroundColor: user?.role === 'admin' ? '#FF3B30' : '#007AFF' },
            ]}
          >
            <Text style={styles.profileRoleText}>
              {user?.role === 'admin' ? 'Administrator' : 'Employee'}
            </Text>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileDetailRow}>
            <Ionicons name="id-card-outline" size={20} color="#8E8E93" />
            <View style={styles.profileDetailContent}>
              <Text style={styles.profileDetailLabel}>Employee ID</Text>
              <Text style={styles.profileDetailValue}>{user?.id}</Text>
            </View>
          </View>

          <View style={styles.profileDetailRow}>
            <Ionicons name="mail-outline" size={20} color="#8E8E93" />
            <View style={styles.profileDetailContent}>
              <Text style={styles.profileDetailLabel}>Email</Text>
              <Text style={styles.profileDetailValue}>{user?.email}</Text>
            </View>
          </View>

          {profile?.employee?.joined_date && (
            <View style={styles.profileDetailRow}>
              <Ionicons name="calendar-outline" size={20} color="#8E8E93" />
              <View style={styles.profileDetailContent}>
                <Text style={styles.profileDetailLabel}>Joined</Text>
                <Text style={styles.profileDetailValue}>
                  {new Date(profile.employee.joined_date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {profile?.statistics && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>My Statistics</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statItemValue}>
                  {profile.statistics.total_attendance_days}
                </Text>
                <Text style={styles.statItemLabel}>Total Days</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statItemValue}>
                  {profile.statistics.complete_days}
                </Text>
                <Text style={styles.statItemLabel}>Complete Days</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statItemValue}>
                  {(profile.statistics.average_confidence * 100).toFixed(1)}%
                </Text>
                <Text style={styles.statItemLabel}>Avg Match</Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ============= Tab Navigators =============
function EmployeeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={EmployeeHomeScreen} options={{ title: 'Attendance' }} />
      <Tab.Screen name="History" component={EmployeeHistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Analytics') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Register') iconName = focused ? 'person-add' : 'person-add-outline';
          else if (route.name === 'Attendance') iconName = focused ? 'checkmark-done' : 'checkmark-done-outline';
          else if (route.name === 'Employees') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          else if (route.name == 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Analytics" component={AdminAnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Register" component={AdminRegisterScreen} options={{ title: 'Register' }} />
      <Tab.Screen name="Attendance" component={AdminAttendanceScreen} options={{ title: 'Attendance' }} />
      <Tab.Screen name="Employees" component={AdminEmployeesScreen} options={{ title: 'Employees' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Tab.Screen name="Settings" component={AdminSettingsScreen} options={{ title : 'Settings' }} />
    </Tab.Navigator>
  );
}

// ============= Main App =============
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="EmployeeTabs" component={EmployeeTabs} />
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ============= Styles =============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },
  
  // Login Styles
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inputIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#000',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginFooter: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  
  // Camera Styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 250,
    height: 300,
    borderWidth: 3,
    borderColor: '#007AFF',
    borderRadius: 150,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuideText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cameraButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#000',
  },
  cameraButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#007AFF',
  },
  
  // Employee Home Styles
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  currentTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  currentDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#8E8E93',
  },
  statusBadgeComplete: {
    backgroundColor: '#34C759',
  },
  statusBadgeActive: {
    backgroundColor: '#FF9500',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDotActive: {
    backgroundColor: '#007AFF',
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  timelineValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  timelineValueActive: {
    color: '#000',
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E5E5EA',
    marginLeft: 19,
    marginBottom: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  checkInButton: {
    backgroundColor: '#34C759',
  },
  checkOutButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  processingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  completedCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
  },
  completedText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#000',
    marginLeft: 12,
    flex: 1,
  },
  
  // History Styles
  paginationInfo: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  paginationText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  historyYear: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  historyStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  historyStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  historyTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyTimeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  historyTimeContent: {
    marginLeft: 8,
    flex: 1,
  },
  historyTimeLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  historyTimeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  confidenceText: {
    fontSize: 11,
    color: '#34C759',
    marginTop: 2,
  },
  historyDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  locationText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 6,
  },
  
  // Admin Register Styles
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 12,
  },
  roleSection: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  roleButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  roleButtonText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 8,
  },
  roleButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  faceSection: {
    marginBottom: 24,
  },
  faceSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: 200,
    height: 250,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
  },
  retakeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  capturePhotoButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  capturePhotoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 12,
  },
  capturePhotoSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Admin Attendance Styles
  adminHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  datePickerText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 8,
    fontWeight: '500',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
  },
  datePickerCancel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  datePickerConfirm: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  recordCount: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  adminRecordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  adminRecordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  adminRecordInfo: {
    flex: 1,
  },
  adminRecordName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  adminRecordId: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  adminRecordEmail: {
    fontSize: 12,
    color: '#8E8E93',
  },
  adminStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  adminStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  adminRecordDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },
  adminRecordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  adminRecordItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  adminRecordItemContent: {
    marginLeft: 8,
    flex: 1,
  },
  adminRecordLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  adminRecordValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  adminConfidenceText: {
    fontSize: 11,
    color: '#34C759',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalBody: {
    padding: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Employee Card Styles
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  employeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  employeeAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  employeeId: {
    fontSize: 12,
    color: '#8E8E93',
  },
  employeeStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  employeeStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  employeeDetails: {
    marginBottom: 12,
  },
  employeeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  employeeDetailText: {
    fontSize: 14,
    color: '#000',
    marginLeft: 8,
  },
  employeeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  employeeActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Analytics Styles
  analyticsHeader: {
    marginBottom: 24,
  },
  analyticsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  analyticsDateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dateRangeSeparator: {
    fontSize: 14,
    color: '#8E8E93',
    marginHorizontal: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  topEmployeesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  topEmployeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  topEmployeeRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topEmployeeRankText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  topEmployeeInfo: {
    flex: 1,
  },
  topEmployeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  topEmployeeId: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  topEmployeeDays: {
    alignItems: 'flex-end',
  },
  topEmployeeDaysText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  topEmployeeDaysLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  
  // Profile Styles
  profileHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  profileRoleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  profileRoleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  profileDetailContent: {
    marginLeft: 16,
    flex: 1,
  },
  profileDetailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  profileDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statItemValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statItemLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // List Styles
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  footerLoader: {
    marginVertical: 16,
  },
  
  // Tab Bar
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    height: 60,
    paddingBottom: 8,
  },
  
  // Loading and Permission Styles
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});