export interface CampusNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'entrance' | 'building' | 'junction' | 'amenity' | 'parking';
  buildingId?: string;
  department?: string;
  floor?: string | number;
  description?: string;
}

export interface CampusEdge {
  from: string;
  to: string;
  weight: number; // distance in meters
  type?: 'walkway' | 'road' | 'corridor' | 'bridge';
}

export interface CampusBuilding {
  id: string;
  code: string;
  name: string;
  shortName: string;
  department: string;
  x: number;
  y: number;
  width: number;
  height: number;
  entranceNodeId: string;
  type: 'academic' | 'administrative' | 'amenity' | 'hostel' | 'sports';
  floors: number;
  labIds: string[];
  description: string;
}

export interface CampusAmenity {
  id: string;
  name: string;
  type: 'canteen' | 'library' | 'parking' | 'gate' | 'sports' | 'garden';
  x: number;
  y: number;
  width?: number;
  height?: number;
  nodeId: string;
}

// -------------------------------------------------------------
// RIT Campus Buildings Definition
// -------------------------------------------------------------
export const campusBuildings: CampusBuilding[] = [
  {
    id: 'bld_admin',
    code: 'ADM',
    name: 'Administrative Complex (Directorate)',
    shortName: 'Admin Block',
    department: 'Institute Administration',
    x: 220,
    y: 430,
    width: 130,
    height: 80,
    entranceNodeId: 'node_admin',
    type: 'administrative',
    floors: 3,
    labIds: [],
    description: 'Central Administrative Offices, Director Office, Registrar, and Academic Deanery.',
  },
  {
    id: 'bld_library',
    code: 'LIB',
    name: 'Central Knowledge Resource Center',
    shortName: 'Central Library',
    department: 'Learning Resources',
    x: 230,
    y: 260,
    width: 140,
    height: 90,
    entranceNodeId: 'node_library',
    type: 'academic',
    floors: 3,
    labIds: [],
    description: 'Digital library repository, research reading halls, and IEEE resource center.',
  },
  {
    id: 'bld_cse',
    code: 'CSE',
    name: 'Alan Turing Hall — Computer Science & Engg',
    shortName: 'CSE Department',
    department: 'Computer Science & Engineering',
    x: 440,
    y: 200,
    width: 150,
    height: 100,
    entranceNodeId: 'node_turing',
    type: 'academic',
    floors: 4,
    labIds: ['lab_cse_01'],
    description: 'Advanced networking labs, software development suites, and distributed systems hub.',
  },
  {
    id: 'bld_ai',
    code: 'AI-ROB',
    name: 'Grace Hopper Complex — AI & Robotics Hub',
    shortName: 'AI & Data Science',
    department: 'Artificial Intelligence & Machine Learning',
    x: 660,
    y: 150,
    width: 150,
    height: 95,
    entranceNodeId: 'node_hopper',
    type: 'academic',
    floors: 4,
    labIds: ['lab_ai_02'],
    description: 'GPU Cluster computing node, computer vision workstations, and autonomous robotics arenas.',
  },
  {
    id: 'bld_iot',
    code: 'ENTC',
    name: 'Nikola Tesla Building — Electronics & IoT',
    shortName: 'E&TC / IoT Dept',
    department: 'Electronics & Telecommunication',
    x: 430,
    y: 450,
    width: 140,
    height: 95,
    entranceNodeId: 'node_tesla',
    type: 'academic',
    floors: 3,
    labIds: ['lab_iot_03'],
    description: 'Microcontroller prototyping benches, RF testing chambers, and IoT mesh networks.',
  },
  {
    id: 'bld_vr',
    code: 'VR-LAB',
    name: 'Ada Lovelace Hall — Spatial Computing & VR',
    shortName: 'Innovation & VR',
    department: 'Multidisciplinary Computing',
    x: 640,
    y: 330,
    width: 140,
    height: 90,
    entranceNodeId: 'node_lovelace',
    type: 'academic',
    floors: 3,
    labIds: ['lab_vr_04'],
    description: 'Spatial computing simulators, haptic feedback testbeds, and VR perception suites.',
  },
  {
    id: 'bld_cyber',
    code: 'IT-SEC',
    name: 'Claude Shannon Building — Cybersecurity',
    shortName: 'Cybersecurity Range',
    department: 'Information Technology',
    x: 850,
    y: 280,
    width: 145,
    height: 90,
    entranceNodeId: 'node_shannon',
    type: 'academic',
    floors: 3,
    labIds: ['lab_cyber_05'],
    description: 'Isolated cyber defense simulation arena and digital forensic test environments.',
  },
  {
    id: 'bld_workshop',
    code: 'MECH',
    name: 'Thomas Edison Workshop — Mechanical & FabLab',
    shortName: 'Mechanical FabLab',
    department: 'Mechanical Engineering',
    x: 390,
    y: 630,
    width: 180,
    height: 110,
    entranceNodeId: 'node_edison',
    type: 'academic',
    floors: 2,
    labIds: ['lab_fab_06'],
    description: 'Rapid 3D additive manufacturing, CNC industrial mills, laser cutters, and metrology.',
  },
  {
    id: 'bld_bio',
    code: 'BIO',
    name: 'Rosalind Franklin Center — Bioengineering',
    shortName: 'Biotechnology Center',
    department: 'Biotechnology & Bio-Computing',
    x: 180,
    y: 110,
    width: 140,
    height: 90,
    entranceNodeId: 'node_franklin',
    type: 'academic',
    floors: 3,
    labIds: ['lab_bio_07'],
    description: 'High-throughput genomic sequencing workstations and bio-informatics cluster.',
  },
  {
    id: 'bld_quantum',
    code: 'PHY',
    name: 'Niels Bohr Institute — Quantum & Photonics',
    shortName: 'Quantum Computing',
    department: 'Applied Physics & Nanotechnology',
    x: 870,
    y: 460,
    width: 145,
    height: 95,
    entranceNodeId: 'node_bohr',
    type: 'academic',
    floors: 2,
    labIds: ['lab_quantum_08'],
    description: 'Cryogenic quantum qubit test stages, optical benches, and laser interferometry.',
  },
  {
    id: 'bld_canteen',
    code: 'CANTEEN',
    name: 'Campus Food Court & Student Cafe',
    shortName: 'RIT Canteen',
    department: 'Student Amenities',
    x: 650,
    y: 500,
    width: 120,
    height: 80,
    entranceNodeId: 'node_canteen',
    type: 'amenity',
    floors: 2,
    labIds: [],
    description: 'Central dining hall, coffee kiosks, and open-air student discussion terraces.',
  },
  {
    id: 'bld_hostel_boys',
    code: 'HOSTEL-B',
    name: 'Sahyadri Boys Hostel Residence',
    shortName: 'Boys Hostel',
    department: 'Student Housing',
    x: 720,
    y: 640,
    width: 150,
    height: 95,
    entranceNodeId: 'node_hostel_b',
    type: 'hostel',
    floors: 4,
    labIds: [],
    description: 'Residential dormitories and residential study halls.',
  },
  {
    id: 'bld_hostel_girls',
    code: 'HOSTEL-G',
    name: 'Krishna Girls Hostel Residence',
    shortName: 'Girls Hostel',
    department: 'Student Housing',
    x: 910,
    y: 640,
    width: 140,
    height: 95,
    entranceNodeId: 'node_hostel_g',
    type: 'hostel',
    floors: 4,
    labIds: [],
    description: 'Residential dormitories and security access gates.',
  },
  {
    id: 'bld_auditorium',
    code: 'AUD',
    name: 'Rajarambapu Memorial Auditorium',
    shortName: 'Auditorium',
    department: 'Events & Cultural',
    x: 210,
    y: 570,
    width: 120,
    height: 90,
    entranceNodeId: 'node_auditorium',
    type: 'amenity',
    floors: 2,
    labIds: [],
    description: '1,500-seat plenary hall for conferences, hackathons, and symposiums.',
  },
];

// -------------------------------------------------------------
// Campus Navigation Nodes (Intersections, Entrances, Hubs)
// -------------------------------------------------------------
export const campusNodes: CampusNode[] = [
  // 1. Main Entrance & Gate
  {
    id: 'node_gate',
    name: 'RIT Main Campus Gate (West Highway)',
    x: 60,
    y: 470,
    type: 'entrance',
    description: 'Main pedestrian and vehicle entrance security checkpoint.',
  },
  {
    id: 'node_gate_plaza',
    name: 'Entry Arrival Plaza',
    x: 140,
    y: 470,
    type: 'junction',
    description: 'Welcome fountain and signpost hub.',
  },

  // 2. Main Longitudinal Corridors (Avenue & Crossings)
  {
    id: 'node_quad_south',
    name: 'Administration Avenue Crossing',
    x: 240,
    y: 470,
    type: 'junction',
    description: 'Crossway between Directorate and Central Science Quad.',
  },
  {
    id: 'node_admin',
    name: 'Administrative Building Main Porch',
    x: 285,
    y: 430,
    type: 'building',
    buildingId: 'bld_admin',
    description: 'Entrance to Administrative Complex.',
  },
  {
    id: 'node_auditorium',
    name: 'Memorial Auditorium Foyer',
    x: 270,
    y: 570,
    type: 'amenity',
    buildingId: 'bld_auditorium',
  },
  {
    id: 'node_parking_west',
    name: 'West Campus Parking',
    x: 100,
    y: 600,
    type: 'parking',
  },

  // 3. Central Promenade & Central Science Quad
  {
    id: 'node_quad',
    name: 'Central Science Quad (Open Amphitheater)',
    x: 380,
    y: 360,
    type: 'junction',
    description: 'Central landscaped promenade surrounded by green gardens.',
  },
  {
    id: 'node_library',
    name: 'Central Library Main Entrance',
    x: 300,
    y: 305,
    type: 'building',
    buildingId: 'bld_library',
  },
  {
    id: 'node_north_avenue',
    name: 'North Innovation Promenade',
    x: 380,
    y: 200,
    type: 'junction',
  },
  {
    id: 'node_franklin',
    name: 'Rosalind Franklin Center Entrance',
    x: 250,
    y: 155,
    type: 'building',
    buildingId: 'bld_bio',
  },

  // 4. Engineering & Computing Quads
  {
    id: 'node_turing',
    name: 'Alan Turing Hall (CSE Department Portal)',
    x: 515,
    y: 250,
    type: 'building',
    buildingId: 'bld_cse',
    department: 'Computer Science & Engineering',
  },
  {
    id: 'node_east_crossing_north',
    name: 'Computing Quad Junction',
    x: 590,
    y: 200,
    type: 'junction',
  },
  {
    id: 'node_hopper',
    name: 'Grace Hopper Complex Entrance (AI Hub)',
    x: 735,
    y: 195,
    type: 'building',
    buildingId: 'bld_ai',
    department: 'AI & Data Science',
  },
  {
    id: 'node_mid_avenue',
    name: 'Central Academic Crossing',
    x: 560,
    y: 360,
    type: 'junction',
  },
  {
    id: 'node_lovelace',
    name: 'Ada Lovelace Hall Portal (VR & Multimedia)',
    x: 710,
    y: 375,
    type: 'building',
    buildingId: 'bld_vr',
  },
  {
    id: 'node_shannon',
    name: 'Claude Shannon Hall Entrance (Cyber Range)',
    x: 920,
    y: 325,
    type: 'building',
    buildingId: 'bld_cyber',
  },

  // 5. Southern Science Wing & Workshops
  {
    id: 'node_south_avenue',
    name: 'Technology Promenade South',
    x: 480,
    y: 470,
    type: 'junction',
  },
  {
    id: 'node_tesla',
    name: 'Nikola Tesla Building Entrance (IoT Lab)',
    x: 500,
    y: 450,
    type: 'building',
    buildingId: 'bld_iot',
  },
  {
    id: 'node_edison',
    name: 'Thomas Edison Workshop Entrance (FabLab)',
    x: 480,
    y: 630,
    type: 'building',
    buildingId: 'bld_workshop',
  },
  {
    id: 'node_canteen',
    name: 'Campus Food Court & Cafeteria Plaza',
    x: 710,
    y: 500,
    type: 'amenity',
    buildingId: 'bld_canteen',
  },
  {
    id: 'node_bohr',
    name: 'Niels Bohr Institute Entrance (Quantum Optics)',
    x: 940,
    y: 510,
    type: 'building',
    buildingId: 'bld_quantum',
  },

  // 6. Residential & Hostel Sector
  {
    id: 'node_hostel_crossing',
    name: 'Residential Campus Plaza',
    x: 780,
    y: 600,
    type: 'junction',
  },
  {
    id: 'node_hostel_b',
    name: 'Sahyadri Boys Hostel Gateway',
    x: 795,
    y: 640,
    type: 'amenity',
    buildingId: 'bld_hostel_boys',
  },
  {
    id: 'node_hostel_g',
    name: 'Krishna Girls Hostel Gateway',
    x: 980,
    y: 640,
    type: 'amenity',
    buildingId: 'bld_hostel_girls',
  },
  {
    id: 'node_parking_east',
    name: 'East Faculty & Student Parking',
    x: 1040,
    y: 400,
    type: 'parking',
  },
  {
    id: 'node_sports',
    name: 'Campus Sports Complex & Track',
    x: 1020,
    y: 190,
    type: 'amenity',
  },
];

// -------------------------------------------------------------
// Campus Walkway & Road Graph (Edges with realistic distances)
// -------------------------------------------------------------
export const campusEdges: CampusEdge[] = [
  // Gate to Plaza
  { from: 'node_gate', to: 'node_gate_plaza', weight: 80, type: 'road' },
  { from: 'node_gate_plaza', to: 'node_quad_south', weight: 100, type: 'walkway' },
  { from: 'node_gate_plaza', to: 'node_parking_west', weight: 130, type: 'road' },
  { from: 'node_parking_west', to: 'node_auditorium', weight: 170, type: 'walkway' },

  // South Quad Links
  { from: 'node_quad_south', to: 'node_admin', weight: 45, type: 'walkway' },
  { from: 'node_quad_south', to: 'node_auditorium', weight: 100, type: 'walkway' },
  { from: 'node_quad_south', to: 'node_quad', weight: 140, type: 'walkway' },
  { from: 'node_quad_south', to: 'node_south_avenue', weight: 240, type: 'road' },

  // Central Quad Hub
  { from: 'node_quad', to: 'node_library', weight: 95, type: 'walkway' },
  { from: 'node_quad', to: 'node_north_avenue', weight: 160, type: 'walkway' },
  { from: 'node_quad', to: 'node_mid_avenue', weight: 180, type: 'walkway' },
  { from: 'node_quad', to: 'node_south_avenue', weight: 150, type: 'walkway' },

  // North Sector (Library, Franklin Bio, Turing CSE)
  { from: 'node_library', to: 'node_north_avenue', weight: 130, type: 'walkway' },
  { from: 'node_north_avenue', to: 'node_franklin', weight: 140, type: 'walkway' },
  { from: 'node_north_avenue', to: 'node_turing', weight: 145, type: 'walkway' },
  { from: 'node_north_avenue', to: 'node_east_crossing_north', weight: 210, type: 'walkway' },

  // Computing & AI Quad
  { from: 'node_turing', to: 'node_east_crossing_north', weight: 90, type: 'walkway' },
  { from: 'node_turing', to: 'node_mid_avenue', weight: 120, type: 'walkway' },
  { from: 'node_east_crossing_north', to: 'node_hopper', weight: 150, type: 'walkway' },
  { from: 'node_hopper', to: 'node_shannon', weight: 230, type: 'walkway' },
  { from: 'node_hopper', to: 'node_sports', weight: 280, type: 'walkway' },

  // Middle Avenue to VR & Cyber
  { from: 'node_mid_avenue', to: 'node_lovelace', weight: 150, type: 'walkway' },
  { from: 'node_mid_avenue', to: 'node_south_avenue', weight: 140, type: 'walkway' },
  { from: 'node_lovelace', to: 'node_shannon', weight: 210, type: 'walkway' },
  { from: 'node_lovelace', to: 'node_canteen', weight: 140, type: 'walkway' },
  { from: 'node_shannon', to: 'node_bohr', weight: 190, type: 'walkway' },
  { from: 'node_shannon', to: 'node_parking_east', weight: 140, type: 'walkway' },

  // South Promenade (Tesla IoT, Edison Workshop, Canteen)
  { from: 'node_south_avenue', to: 'node_tesla', weight: 35, type: 'walkway' },
  { from: 'node_south_avenue', to: 'node_edison', weight: 160, type: 'road' },
  { from: 'node_south_avenue', to: 'node_canteen', weight: 230, type: 'walkway' },
  { from: 'node_tesla', to: 'node_canteen', weight: 215, type: 'walkway' },
  { from: 'node_edison', to: 'node_hostel_crossing', weight: 300, type: 'road' },

  // Canteen, Quantum & Hostels
  { from: 'node_canteen', to: 'node_bohr', weight: 230, type: 'walkway' },
  { from: 'node_canteen', to: 'node_hostel_crossing', weight: 125, type: 'walkway' },
  { from: 'node_bohr', to: 'node_parking_east', weight: 150, type: 'road' },
  { from: 'node_bohr', to: 'node_hostel_crossing', weight: 185, type: 'walkway' },
  { from: 'node_hostel_crossing', to: 'node_hostel_b', weight: 45, type: 'walkway' },
  { from: 'node_hostel_crossing', to: 'node_hostel_g', weight: 200, type: 'walkway' },
  { from: 'node_hostel_g', to: 'node_parking_east', weight: 240, type: 'road' },
];

// -------------------------------------------------------------
// Lab-to-Node and Building Mappings
// -------------------------------------------------------------
export const labDestinationMap: Record<
  string,
  {
    nodeId: string;
    buildingId: string;
    room: string;
    floor: string;
    department: string;
    displayName: string;
  }
> = {
  lab_cse_01: {
    nodeId: 'node_turing',
    buildingId: 'bld_cse',
    room: 'Room 101',
    floor: '1st Floor',
    department: 'Computer Science & Engineering',
    displayName: 'Advanced Systems & Networking Lab',
  },
  lab_ai_02: {
    nodeId: 'node_hopper',
    buildingId: 'bld_ai',
    room: 'Room 202 (GPU Lab)',
    floor: '2nd Floor',
    department: 'AI & Data Science',
    displayName: 'Deep Learning & Robotics Hub',
  },
  lab_iot_03: {
    nodeId: 'node_tesla',
    buildingId: 'bld_iot',
    room: 'Room 301',
    floor: '3rd Floor',
    department: 'Electronics & Telecommunication',
    displayName: 'Embedded Systems & IoT Prototyping',
  },
  lab_vr_04: {
    nodeId: 'node_lovelace',
    buildingId: 'bld_vr',
    room: 'Room 405 (Spatial Lab)',
    floor: '4th Floor',
    department: 'Innovation Pavilion',
    displayName: 'Virtual Reality & Spatial Computing Lab',
  },
  lab_cyber_05: {
    nodeId: 'node_shannon',
    buildingId: 'bld_cyber',
    room: 'Room 501',
    floor: '2nd Floor',
    department: 'Information Technology',
    displayName: 'Cybersecurity & Forensic Range',
  },
  lab_fab_06: {
    nodeId: 'node_edison',
    buildingId: 'bld_workshop',
    room: 'Bay 102 (Workshop)',
    floor: 'Ground Floor',
    department: 'Mechanical Engineering',
    displayName: 'Additive Manufacturing & FabLab',
  },
  lab_bio_07: {
    nodeId: 'node_franklin',
    buildingId: 'bld_bio',
    room: 'Room 304',
    floor: '3rd Floor',
    department: 'Biotechnology & Bio-Computing',
    displayName: 'Computational Biology & Genomics Lab',
  },
  lab_quantum_08: {
    nodeId: 'node_bohr',
    buildingId: 'bld_quantum',
    room: 'Room 108 (Basement Lab)',
    floor: 'Sub-level 1',
    department: 'Applied Physics & Nanotechnology',
    displayName: 'Quantum Computing & Optics Facility',
  },
};
