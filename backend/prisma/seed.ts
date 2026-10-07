import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  // Clean up in reverse relation order
  await prisma.auditLog.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.demandReminder.deleteMany();
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentDemand.deleteMany();
  await prisma.flat.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.broker.deleteMany();
  await prisma.poException.deleteMany();
  await prisma.poLineItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.materialDemand.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.boqItem.deleteMany();
  await prisma.complianceItem.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.meetingDecision.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.issueSnagRfi.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.document.deleteMany();
  await prisma.drawing.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.monthlyReport.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.contractor.deleteMany();
  await prisma.building.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.systemSetting.deleteMany();

  console.log('Seeding Organization...');
  const org = await prisma.organization.create({
    data: {
      name: 'Skyline Infrastructure & Developers Corp',
      code: 'SKYLINE-DEV',
    },
  });

  console.log('Seeding Users & Roles...');
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const usersData = [
    { name: 'Siddharth Sharma', email: 'admin@builderops.com', role: 'Super Admin' },
    { name: 'Vikram Mehta', email: 'builder.admin@builderops.com', role: 'Builder Admin' },
    { name: 'Ananya Roy', email: 'pm@builderops.com', role: 'Project Manager' },
    { name: 'Rajesh Patil', email: 'engineer@builderops.com', role: 'Site Engineer' },
    { name: 'Amit Desai', email: 'procurement@builderops.com', role: 'Procurement' },
    { name: 'Suresh Kumar', email: 'inventory@builderops.com', role: 'Inventory Manager' },
    { name: 'Kavita Menon', email: 'finance@builderops.com', role: 'Finance' },
    { name: 'Arjun Singhania', email: 'sales@builderops.com', role: 'Sales' },
    { name: 'Deepa Nair', email: 'compliance@builderops.com', role: 'Compliance Manager' },
    { name: 'Harish Verma', email: 'contractor@builderops.com', role: 'Contractor' },
    { name: 'Pooja Hegde', email: 'crm@builderops.com', role: 'CRM/Collections Manager' },
    { name: 'Sunil Rao', email: 'broker@builderops.com', role: 'Broker' },
    { name: 'R. K. Gupta', email: 'exec@builderops.com', role: 'Management' },
  ];

  for (const u of usersData) {
    await prisma.user.create({
      data: {
        organizationId: org.id,
        email: u.email,
        password: passwordHash,
        name: u.name,
        role: u.role,
        phone: '+91 98201 ' + Math.floor(10000 + Math.random() * 90000),
      },
    });
  }

  console.log('Seeding Projects & Buildings...');
  const project1 = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: 'Skyline Solitaire Towers',
      code: 'PRJ-SOLITAIRE',
      location: 'Sector 62, Gurgaon, Haryana',
      startDate: new Date('2024-01-15'),
      targetDate: new Date('2026-12-31'),
      status: 'IN_PROGRESS',
      budget: 185000000,
      actualSpend: 74200000,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: 'The Grand Pinnacle Heights',
      code: 'PRJ-PINNACLE',
      location: 'Whitefield, Bengaluru, Karnataka',
      startDate: new Date('2024-06-01'),
      targetDate: new Date('2027-04-30'),
      status: 'IN_PROGRESS',
      budget: 240000000,
      actualSpend: 51800000,
    },
  });

  const towerA = await prisma.building.create({
    data: {
      projectId: project1.id,
      name: 'Tower A (Sapphire)',
      code: 'SOL-TWR-A',
      totalFloors: 14,
      totalUnits: 56,
    },
  });

  const towerB = await prisma.building.create({
    data: {
      projectId: project1.id,
      name: 'Tower B (Emerald)',
      code: 'SOL-TWR-B',
      totalFloors: 14,
      totalUnits: 56,
    },
  });

  const towerC = await prisma.building.create({
    data: {
      projectId: project2.id,
      name: 'Tower 1 (Aero)',
      code: 'PIN-TWR-1',
      totalFloors: 18,
      totalUnits: 72,
    },
  });

  console.log('Seeding Brokers & Customers...');
  const broker1 = await prisma.broker.create({
    data: {
      name: 'Square Yards Realty Partners',
      company: 'Square Yards Ltd',
      contact: '+91 98111 22334',
      email: 'partners@squareyards.com',
      registrationNo: 'HARERA/GGM/2022/411',
      salesPerson: 'Arjun Singhania',
      commissionRate: 2.0,
      status: 'ACTIVE',
    },
  });

  const broker2 = await prisma.broker.create({
    data: {
      name: 'Apex Horizon Estates',
      company: 'Apex Advisory Services',
      contact: '+91 98222 33445',
      email: 'deals@apexestates.in',
      registrationNo: 'HARERA/GGM/2023/189',
      salesPerson: 'Arjun Singhania',
      commissionRate: 2.5,
      status: 'ACTIVE',
    },
  });

  const customersData = [
    { name: 'Dr. Vivek Saxena', email: 'vivek.saxena@gmail.com', phone: '+91 98200 11221', pan: 'AAAPS1234F', address: 'B-402, Nirvana Country, Gurgaon' },
    { name: 'Meera Krishnan', email: 'meera.k@outlook.com', phone: '+91 98200 22332', pan: 'BCDPK5678G', address: 'Villa 14, Palm Grove, Bengaluru' },
    { name: 'Rohan Deshmukh', email: 'rohan.deshmukh@tcs.com', phone: '+91 98200 33443', pan: 'CDEPD9012H', address: 'Flat 1102, Hiranandani, Powai, Mumbai' },
    { name: 'Sunita & Alok Bansal', email: 'alok.bansal@bansalexports.com', phone: '+91 98200 44554', pan: 'DEFPA3456J', address: 'Plot 88, Civil Lines, Jaipur' },
    { name: 'Tarun Chopra', email: 'tarun.chopra@deloitte.com', phone: '+91 98200 55665', pan: 'EFGPC7890K', address: 'Tower 4, DLF Phase 5, Gurgaon' },
    { name: 'Priyanka Sen', email: 'priyanka.sen@wipro.com', phone: '+91 98200 66776', pan: 'FGHPS2345L', address: 'Indiranagar 100ft Rd, Bengaluru' },
    { name: 'Gaurav Narang', email: 'gaurav.narang@gmail.com', phone: '+91 98200 77887', pan: 'GHIPN6789M', address: 'Sector 54, Golf Course Rd, Gurgaon' },
  ];

  const createdCustomers = [];
  for (let i = 0; i < customersData.length; i++) {
    const cust = await prisma.customer.create({
      data: {
        ...customersData[i],
        salesExecutiveName: 'Arjun Singhania',
        brokerId: i % 2 === 0 ? broker1.id : broker2.id,
        status: 'ACTIVE',
      },
    });
    createdCustomers.push(cust);
  }

  console.log('Seeding 24 Flats with real-estate commercial states...');
  // Configurations: 2BHK, 3BHK, 4BHK
  const flatConfigs = [
    { config: '2BHK', carpet: 950, saleable: 1350, base: 9500000, other: 500000 },
    { config: '3BHK', carpet: 1420, saleable: 1980, base: 14500000, other: 750000 },
    { config: '4BHK', carpet: 2150, saleable: 2950, base: 22000000, other: 1200000 },
  ];

  // We will create 24 flats across Tower A and Tower B
  const flatStatuses = [
    'SOLD', 'SOLD', 'AGREEMENT', 'BOOKED', 'BLOCKED', 'AVAILABLE',
    'SOLD', 'AGREEMENT', 'BOOKED', 'AVAILABLE', 'AVAILABLE', 'CANCELLED',
    'SOLD', 'SOLD', 'AGREEMENT', 'BOOKED', 'AVAILABLE', 'AVAILABLE',
    'SOLD', 'AGREEMENT', 'BOOKED', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'
  ];

  const createdFlats = [];
  let custIndex = 0;

  for (let f = 1; f <= 24; f++) {
    const floor = Math.ceil(f / 2);
    const unitLetter = f % 2 === 1 ? 'A' : 'B';
    const unitNum = `${unitLetter}-${floor}${f < 10 ? '0' + f : f}`;
    const cfg = flatConfigs[(f - 1) % flatConfigs.length];
    const status = flatStatuses[f - 1];
    const bld = f <= 12 ? towerA : towerB;
    const isAssigned = ['SOLD', 'AGREEMENT', 'BOOKED', 'BLOCKED'].includes(status);
    const assignedCust = isAssigned ? createdCustomers[custIndex % createdCustomers.length] : null;
    if (isAssigned) custIndex++;

    const flat = await prisma.flat.create({
      data: {
        unitNumber: unitNum,
        projectId: project1.id,
        buildingId: bld.id,
        floorNumber: floor,
        configuration: cfg.config,
        carpetArea: cfg.carpet,
        saleableArea: cfg.saleable,
        parking: cfg.config === '4BHK' ? '2 Covered' : '1 Covered',
        basePrice: cfg.base,
        otherCharges: cfg.other,
        agreementValue: cfg.base + cfg.other,
        totalConsideration: cfg.base + cfg.other,
        status: status,
        customerId: assignedCust ? assignedCust.id : null,
        salesExecutiveName: 'Arjun Singhania',
        brokerId: isAssigned ? (f % 2 === 0 ? broker1.id : broker2.id) : null,
        bookingDate: isAssigned ? new Date('2024-03-10') : null,
        agreementDate: ['SOLD', 'AGREEMENT'].includes(status) ? new Date('2024-04-15') : null,
        notes: status === 'CANCELLED' ? 'Client relocated overseas. Refund issued.' : null,
        cancellationDate: status === 'CANCELLED' ? new Date('2024-05-20') : null,
      },
    });
    createdFlats.push(flat);
  }

  console.log('Seeding Payment Demands, Payments & Reminders for Flats...');
  const now = new Date();
  const past30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const past15Days = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const future15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const future45Days = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

  // Flat A-1204 requirement specifically mentioned in prompt:
  // "What is the next demand for Flat A-1204?"
  const flatA1204 = createdFlats[0]; // let's ensure unit number is A-1204
  await prisma.flat.update({
    where: { id: flatA1204.id },
    data: { unitNumber: 'A-1204', status: 'SOLD' },
  });

  // Demand 1: Booking Amount (Paid)
  const d1 = await prisma.paymentDemand.create({
    data: {
      demandNumber: 'DEM-2024-001',
      flatId: flatA1204.id,
      customerId: flatA1204.customerId!,
      projectId: project1.id,
      demandType: 'BOOKING_AMOUNT',
      demandDate: new Date('2024-03-01'),
      dueDate: new Date('2024-03-15'),
      demandAmount: 1000000,
      taxAmount: 50000,
      totalAmount: 1050000,
      paidAmount: 1050000,
      balanceAmount: 0,
      status: 'PAID',
      paymentDate: new Date('2024-03-12'),
      daysOverdue: 0,
    },
  });

  // Payment 1 for D1
  const p1 = await prisma.payment.create({
    data: {
      receiptNumber: 'RCP-2024-8801',
      paymentDate: new Date('2024-03-12'),
      amount: 1050000,
      paymentMode: 'RTGS',
      transactionRef: 'HDFCR20240312009',
      status: 'VERIFIED',
      flatId: flatA1204.id,
      customerId: flatA1204.customerId!,
      notes: 'Initial booking token receipt',
    },
  });

  await prisma.paymentAllocation.create({
    data: {
      paymentId: p1.id,
      demandId: d1.id,
      amount: 1050000,
    },
  });

  // Demand 2: Agreement Payment (Paid)
  const d2 = await prisma.paymentDemand.create({
    data: {
      demandNumber: 'DEM-2024-002',
      flatId: flatA1204.id,
      customerId: flatA1204.customerId!,
      projectId: project1.id,
      demandType: 'AGREEMENT_PAYMENT',
      demandDate: new Date('2024-04-01'),
      dueDate: new Date('2024-04-20'),
      demandAmount: 1500000,
      taxAmount: 75000,
      totalAmount: 1575000,
      paidAmount: 1575000,
      balanceAmount: 0,
      status: 'PAID',
      paymentDate: new Date('2024-04-18'),
      daysOverdue: 0,
    },
  });

  const p2 = await prisma.payment.create({
    data: {
      receiptNumber: 'RCP-2024-8845',
      paymentDate: new Date('2024-04-18'),
      amount: 1575000,
      paymentMode: 'NEFT',
      transactionRef: 'ICICN20240418042',
      status: 'VERIFIED',
      flatId: flatA1204.id,
      customerId: flatA1204.customerId!,
      notes: 'Agreement execution demand cleared',
    },
  });

  await prisma.paymentAllocation.create({
    data: {
      paymentId: p2.id,
      demandId: d2.id,
      amount: 1575000,
    },
  });

  // Demand 3: 5th Floor Slab (Overdue with partial payment)
  const d3 = await prisma.paymentDemand.create({
    data: {
      demandNumber: 'DEM-2024-003',
      flatId: flatA1204.id,
      customerId: flatA1204.customerId!,
      projectId: project1.id,
      demandType: 'FLOOR_SLAB',
      demandDate: new Date('2024-08-01'),
      dueDate: past15Days,
      demandAmount: 1800000,
      taxAmount: 90000,
      totalAmount: 1890000,
      paidAmount: 890000,
      balanceAmount: 1000000,
      status: 'OVERDUE',
      daysOverdue: 15,
    },
  });

  const p3 = await prisma.payment.create({
    data: {
      receiptNumber: 'RCP-2024-9102',
      paymentDate: past15Days,
      amount: 890000,
      paymentMode: 'UPI',
      transactionRef: 'UPI/20240825/9981',
      status: 'VERIFIED',
      flatId: flatA1204.id,
      customerId: flatA1204.customerId!,
      notes: 'Partial payment towards slab casting demand',
    },
  });

  await prisma.paymentAllocation.create({
    data: {
      paymentId: p3.id,
      demandId: d3.id,
      amount: 890000,
    },
  });

  // Reminder records for d3
  await prisma.demandReminder.create({
    data: {
      demandId: d3.id,
      customerId: flatA1204.customerId!,
      reminderType: 'SEVEN_DAYS_BEFORE',
      scheduledDate: new Date(past15Days.getTime() - 7 * 86400000),
      sentDate: new Date(past15Days.getTime() - 7 * 86400000),
      recipient: 'vivek.saxena@gmail.com',
      status: 'SENT',
      emailRef: 'EML-REM-10023',
    },
  });

  await prisma.demandReminder.create({
    data: {
      demandId: d3.id,
      customerId: flatA1204.customerId!,
      reminderType: 'ON_DUE_DATE',
      scheduledDate: past15Days,
      sentDate: past15Days,
      recipient: 'vivek.saxena@gmail.com',
      status: 'SENT',
      emailRef: 'EML-REM-10045',
    },
  });

  await prisma.demandReminder.create({
    data: {
      demandId: d3.id,
      customerId: flatA1204.customerId!,
      reminderType: 'SEVEN_DAYS_AFTER',
      scheduledDate: new Date(past15Days.getTime() + 7 * 86400000),
      sentDate: new Date(past15Days.getTime() + 7 * 86400000),
      recipient: 'vivek.saxena@gmail.com',
      status: 'SENT',
      emailRef: 'EML-REM-10089',
    },
  });

  // Demand 4: 10th Floor Slab (Upcoming demand for A-1204)
  await prisma.paymentDemand.create({
    data: {
      demandNumber: 'DEM-2024-004',
      flatId: flatA1204.id,
      customerId: flatA1204.customerId!,
      projectId: project1.id,
      demandType: 'FLOOR_SLAB',
      demandDate: now,
      dueDate: future15Days,
      demandAmount: 1800000,
      taxAmount: 90000,
      totalAmount: 1890000,
      paidAmount: 0,
      balanceAmount: 1890000,
      status: 'UPCOMING',
      daysOverdue: 0,
    },
  });

  // Demand 5: Brickwork & Plaster (Future demand for A-1204)
  await prisma.paymentDemand.create({
    data: {
      demandNumber: 'DEM-2024-005',
      flatId: flatA1204.id,
      customerId: flatA1204.customerId!,
      projectId: project1.id,
      demandType: 'MILESTONE',
      demandDate: future15Days,
      dueDate: future45Days,
      demandAmount: 1500000,
      taxAmount: 75000,
      totalAmount: 1575000,
      paidAmount: 0,
      balanceAmount: 1575000,
      status: 'UPCOMING',
      daysOverdue: 0,
    },
  });

  // Populate demands for remaining assigned flats
  for (let i = 1; i < createdFlats.length; i++) {
    const flat = createdFlats[i];
    if (!flat.customerId) continue;

    // Create 1 paid demand and 1 overdue or upcoming demand
    const isOverdueDemo = i % 3 === 0;
    const isDueDemo = i % 3 === 1;

    const dPast = await prisma.paymentDemand.create({
      data: {
        demandNumber: `DEM-2024-${100 + i}`,
        flatId: flat.id,
        customerId: flat.customerId,
        projectId: project1.id,
        demandType: 'BOOKING_AMOUNT',
        demandDate: new Date('2024-02-10'),
        dueDate: new Date('2024-02-25'),
        demandAmount: 800000,
        taxAmount: 40000,
        totalAmount: 840000,
        paidAmount: 840000,
        balanceAmount: 0,
        status: 'PAID',
        paymentDate: new Date('2024-02-22'),
      },
    });

    const p = await prisma.payment.create({
      data: {
        receiptNumber: `RCP-2024-${2000 + i}`,
        paymentDate: new Date('2024-02-22'),
        amount: 840000,
        paymentMode: 'NEFT',
        transactionRef: `UTR${Date.now().toString().slice(-6)}${i}`,
        status: 'VERIFIED',
        flatId: flat.id,
        customerId: flat.customerId,
      },
    });

    await prisma.paymentAllocation.create({
      data: {
        paymentId: p.id,
        demandId: dPast.id,
        amount: 840000,
      },
    });

    if (isOverdueDemo) {
      await prisma.paymentDemand.create({
        data: {
          demandNumber: `DEM-2024-${300 + i}`,
          flatId: flat.id,
          customerId: flat.customerId,
          projectId: project1.id,
          demandType: 'CONSTRUCTION_LINKED',
          demandDate: past30Days,
          dueDate: past15Days,
          demandAmount: 1200000,
          taxAmount: 60000,
          totalAmount: 1260000,
          paidAmount: 0,
          balanceAmount: 1260000,
          status: 'OVERDUE',
          daysOverdue: 15,
        },
      });
    } else if (isDueDemo) {
      await prisma.paymentDemand.create({
        data: {
          demandNumber: `DEM-2024-${400 + i}`,
          flatId: flat.id,
          customerId: flat.customerId,
          projectId: project1.id,
          demandType: 'FLOOR_SLAB',
          demandDate: now,
          dueDate: future15Days,
          demandAmount: 1100000,
          taxAmount: 55000,
          totalAmount: 1155000,
          paidAmount: 0,
          balanceAmount: 1155000,
          status: 'UPCOMING',
          daysOverdue: 0,
        },
      });
    }
  }

  console.log('Seeding Contractors & Contracts...');
  const c1 = await prisma.contractor.create({
    data: {
      name: 'Larsen & Toubro Civil Infra Ltd',
      code: 'CONTR-LT-01',
      contactPerson: 'S. N. Subrahmanyan',
      phone: '+91 22 6752 5656',
      email: 'civil.contracts@lntecc.com',
      scope: 'Structural RCC, Concrete Pours & Core Infrastructure',
      rating: 4.8,
      performanceScore: 92.5,
      status: 'ACTIVE',
    },
  });

  const c2 = await prisma.contractor.create({
    data: {
      name: 'Sterling & Wilson MEP Solutions',
      code: 'CONTR-SW-02',
      contactPerson: 'Khurshid Daruvala',
      phone: '+91 22 2548 5300',
      email: 'mep.projects@sterlingwilson.com',
      scope: 'HVAC, Electrical Substation, Firefighting & Plumbing',
      rating: 4.2,
      performanceScore: 78.0,
      status: 'ACTIVE',
    },
  });

  const c3 = await prisma.contractor.create({
    data: {
      name: 'KONE Elevators India Pvt Ltd',
      code: 'CONTR-KONE-03',
      contactPerson: 'Amit Gossain',
      phone: '+91 44 2653 3000',
      email: 'vertical.transport@kone.com',
      scope: 'High-speed Passenger & Service Elevators',
      rating: 4.9,
      performanceScore: 96.0,
      status: 'ACTIVE',
    },
  });

  await prisma.contract.create({
    data: {
      contractorId: c1.id,
      projectId: project1.id,
      contractNumber: 'CNT-2024-LT-001',
      title: 'Main Structural RCC Works Contract for Tower A & B',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2025-10-31'),
      totalValue: 78000000,
      status: 'ACTIVE',
    },
  });

  await prisma.contract.create({
    data: {
      contractorId: c2.id,
      projectId: project1.id,
      contractNumber: 'CNT-2024-SW-002',
      title: 'Turnkey MEP & Fire Safety Systems Package',
      startDate: new Date('2024-04-15'),
      endDate: new Date('2026-03-31'),
      totalValue: 34500000,
      status: 'ACTIVE',
    },
  });

  console.log('Seeding Material Inventory & Transactions...');
  const invItemsData = [
    { itemCode: 'MAT-CEM-OPC53', name: 'UltraTech Cement OPC 53 Grade', category: 'CEMENT', unit: 'BAGS', minStock: 500, reorderLevel: 800, currentStock: 450, location: 'Central Warehouse Shed 1' },
    { itemCode: 'MAT-STL-TMT16', name: 'Tata Tiscon 550D TMT Rebars 16mm', category: 'STEEL', unit: 'MT', minStock: 25, reorderLevel: 40, currentStock: 18, location: 'Open Yard Bay 3' },
    { itemCode: 'MAT-STL-TMT25', name: 'Tata Tiscon 550D TMT Rebars 25mm', category: 'STEEL', unit: 'MT', minStock: 20, reorderLevel: 35, currentStock: 32, location: 'Open Yard Bay 4' },
    { itemCode: 'MAT-RMC-M35', name: 'Ready Mix Concrete M35 Grade', category: 'AGGREGATE', unit: 'CUM', minStock: 100, reorderLevel: 200, currentStock: 80, location: 'Direct Site Batching' },
    { itemCode: 'MAT-BRK-AAC200', name: 'Siporex AAC Blocks 600x200x200', category: 'BRICKS', unit: 'NOS', minStock: 2000, reorderLevel: 4000, currentStock: 5400, location: 'Block Yard Tower A' },
    { itemCode: 'MAT-PIP-CPVC50', name: 'Astral FlowGuard CPVC Pipes 2 inch', category: 'PLUMBING', unit: 'NOS', minStock: 150, reorderLevel: 300, currentStock: 220, location: 'Store Room B2' },
  ];

  const createdInv = [];
  for (const item of invItemsData) {
    const inv = await prisma.inventoryItem.create({ data: item });
    createdInv.push(inv);

    // Initial opening stock transaction
    await prisma.inventoryTransaction.create({
      data: {
        itemId: inv.id,
        projectId: project1.id,
        type: 'OPENING',
        quantity: item.currentStock + 200,
        reference: 'INIT-OP-2024',
        createdBy: 'Suresh Kumar',
        notes: 'Initial opening stock audit',
      },
    });

    // Consumption issue transaction
    await prisma.inventoryTransaction.create({
      data: {
        itemId: inv.id,
        projectId: project1.id,
        type: 'ISSUE',
        quantity: 200,
        reference: 'ISS-RCC-SLAB5',
        createdBy: 'Suresh Kumar',
        notes: 'Issued to L&T for 5th floor casting',
      },
    });
  }

  console.log('Seeding Material Demands (with Overdue) & Procurement...');
  const cementItem = createdInv[0];
  const steelItem = createdInv[1];

  // Overdue Material Demand (Rule: required_date < now && status != Completed/Received)
  const overdueDemand = await prisma.materialDemand.create({
    data: {
      demandNumber: 'MD-2024-0089',
      itemId: cementItem.id,
      quantity: 800,
      projectId: project1.id,
      requesterName: 'Rajesh Patil',
      requestDate: new Date(Date.now() - 20 * 86400000),
      requiredDate: new Date(Date.now() - 5 * 86400000), // Overdue by 5 days!
      ownerName: 'Rajesh Patil',
      procurementPerson: 'Amit Desai',
      priority: 'CRITICAL',
      status: 'OVERDUE',
      isOverdue: true,
      lastEmailSentAt: new Date(Date.now() - 4 * 86400000),
    },
  });

  const regularDemand = await prisma.materialDemand.create({
    data: {
      demandNumber: 'MD-2024-0094',
      itemId: steelItem.id,
      quantity: 50,
      projectId: project1.id,
      requesterName: 'Rajesh Patil',
      requestDate: new Date(Date.now() - 8 * 86400000),
      requiredDate: future15Days,
      ownerName: 'Rajesh Patil',
      procurementPerson: 'Amit Desai',
      priority: 'HIGH',
      status: 'APPROVED',
      isOverdue: false,
    },
  });

  const vendor1 = await prisma.vendor.create({
    data: {
      name: 'UltraTech Building Solutions Ltd',
      code: 'VND-ULTRA-01',
      contactPerson: 'Sanjay Mathur',
      email: 'orders.delhi@ultratechcement.com',
      phone: '+91 11 4152 7800',
      address: 'DLF Cyber City, Tower B, Gurugram',
      rating: 4.7,
      status: 'ACTIVE',
    },
  });

  const vendor2 = await prisma.vendor.create({
    data: {
      name: 'Tata Steel Tubes & Rebars Depot',
      code: 'VND-TATA-02',
      contactPerson: 'Nitin Roy',
      email: 'tata.rebars@tatasteel.com',
      phone: '+91 33 2288 3333',
      address: 'Okhla Industrial Area Phase 1, New Delhi',
      rating: 4.9,
      status: 'ACTIVE',
    },
  });

  console.log('Seeding Purchase Orders & PO Exceptions (Mismatch detection)...');
  // PO with Quantity Mismatch Exception (Demand = 800, PO = 1000)
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2024-8840',
      vendorId: vendor1.id,
      demandId: overdueDemand.id,
      projectId: project1.id,
      totalAmount: 430000,
      status: 'ISSUED',
      deliveryDate: new Date(Date.now() + 3 * 86400000),
    },
  });

  await prisma.poLineItem.create({
    data: {
      poId: po1.id,
      itemId: cementItem.id,
      quantity: 1000, // Demanded 800, PO has 1000!
      unitPrice: 430,
      amount: 430000,
    },
  });

  // Create PO Exception record as requested in prompt section 18
  await prisma.poException.create({
    data: {
      poId: po1.id,
      demandId: overdueDemand.id,
      type: 'QUANTITY_MISMATCH',
      message: 'PO quantity (1,000 Bags) exceeds approved demand (800 Bags) by 200 Bags. Over-ordering detected.',
      resolved: false,
    },
  });

  console.log('Seeding BOQ Items & Variances...');
  await prisma.boqItem.create({
    data: {
      itemCode: 'BOQ-STR-001',
      description: 'M35 Ready Mix Concrete with Silica Fume for Columns and Shear Walls',
      unit: 'CUM',
      plannedQuantity: 4500,
      rate: 5800,
      amount: 26100000,
      contractorId: c1.id,
      projectId: project1.id,
      buildingId: towerA.id,
      consumedQuantity: 2850,
      remainingQuantity: 1650,
      quantityVariance: 120, // +120 CUM extra consumed due to foundation depth variance
      costVariance: 696000,
    },
  });

  await prisma.boqItem.create({
    data: {
      itemCode: 'BOQ-STR-002',
      description: 'Fe 550D High Yield Strength Deformed Bars cutting, bending and placing',
      unit: 'MT',
      plannedQuantity: 520,
      rate: 68500,
      amount: 35620000,
      contractorId: c1.id,
      projectId: project1.id,
      buildingId: towerA.id,
      consumedQuantity: 310,
      remainingQuantity: 210,
      quantityVariance: -5,
      costVariance: -342500,
    },
  });

  console.log('Seeding Compliance Items & Dynamic percentage...');
  // 10 items: 7 completed, 2 in progress, 1 pending, 1 not applicable
  const complianceData = [
    { name: 'RERA Registration Certificate & Quarterly Progress Report (QPR)', category: 'RERA', status: 'COMPLETED', remarks: 'Q2 2024 QPR uploaded to HRERA portal.' },
    { name: 'Fire Department Provisional NOC & Hydrant Layout Approval', category: 'FIRE_SAFETY', status: 'COMPLETED', remarks: 'CFO approval letter NOC/2024/991 granted.' },
    { name: 'State Pollution Control Board Consent to Establish (CTE)', category: 'ENVIRONMENT', status: 'COMPLETED', remarks: 'Valid until project completion.' },
    { name: 'Labour Cess & BOCW Welfare Fund Clearance', category: 'LABOUR', status: 'COMPLETED', remarks: '1% cess deposited for Stage 2 RCC.' },
    { name: 'Structural Safety & Stability Peer Review by IIT Delhi', category: 'QUALITY', status: 'COMPLETED', remarks: 'Vetting certificate signed by Head of Civil Dept.' },
    { name: 'Height Clearance NOC from Airports Authority of India (AAI)', category: 'LOCAL_AUTHORITY', status: 'COMPLETED', remarks: 'Permitted up to 65.4 meters Above Ground Level.' },
    { name: 'Environmental Clearance (EC) from SEIAA Haryana', category: 'ENVIRONMENT', status: 'COMPLETED', remarks: 'Compliance report submitted biannually.' },
    { name: 'CGWA Ground Water Extraction Permission for Construction', category: 'BUILDING_PERMISSIONS', status: 'IN_PROGRESS', remarks: 'STP water supply agreement active, Borewell renewal pending.' },
    { name: 'Lift Installation License & PWD Inspectorate Inspection', category: 'SAFETY', status: 'PENDING', remarks: 'Shaft handover scheduled next month.' },
    { name: 'Coastal Regulation Zone (CRZ) Clearance', category: 'PROJECT_SPECIFIC', status: 'NOT_APPLICABLE', remarks: 'Site is inland, CRZ regulations not applicable.' },
  ];

  for (const comp of complianceData) {
    await prisma.complianceItem.create({
      data: {
        name: comp.name,
        category: comp.category,
        description: `Statutory verification for ${comp.name} under local state development bylaws.`,
        projectId: project1.id,
        buildingId: towerA.id,
        ownerName: 'Deepa Nair',
        dueDate: future45Days,
        frequency: 'ONE_TIME',
        status: comp.status,
        remarks: comp.remarks,
        evidence: comp.status === 'COMPLETED' ? 'https://docs.builderops.local/cert-verified.pdf' : null,
      },
    });
  }

  console.log('Seeding Documents & Drawings...');
  await prisma.document.create({
    data: {
      organizationId: org.id,
      projectId: project1.id,
      buildingId: towerA.id,
      name: 'Fire Department Provisional NOC - Tower A & B.pdf',
      type: 'PDF',
      category: 'PERMITS',
      version: 1,
      fileType: 'application/pdf',
      storageReference: 'docs/permits/Fire_NOC_TowerA_B_Provisional.pdf',
      fileSize: 421000,
      uploadedBy: 'Deepa Nair',
      status: 'ACTIVE',
      permissions: 'ALL',
      ragEnabled: false,
      ragStatus: 'NOT_INDEXED',
    },
  });

  await prisma.document.create({
    data: {
      organizationId: org.id,
      projectId: project1.id,
      buildingId: towerA.id,
      name: 'L&T Structural RCC Executed Agreement 2024.pdf',
      type: 'CONTRACT',
      category: 'CONTRACTS',
      version: 2,
      fileType: 'application/pdf',
      storageReference: 'docs/contracts/LT_Civil_Contract_Final_Signed.pdf',
      fileSize: 1850000,
      uploadedBy: 'Vikram Mehta',
      status: 'ACTIVE',
      permissions: 'ADMIN_ONLY',
      ragEnabled: false,
      ragStatus: 'NOT_INDEXED',
    },
  });

  await prisma.drawing.create({
    data: {
      drawingNumber: 'DWG-SOL-STR-T1-008',
      name: 'Tower A 5th to 14th Typical Floor Structural Rebar Detailing',
      revision: 'R2',
      projectId: project1.id,
      buildingId: towerA.id,
      category: 'STRUCTURAL',
      status: 'APPROVED',
      uploadedBy: 'Rajesh Patil',
      fileUrl: '/drawings/DWG-SOL-STR-T1-008_R2.dwg',
    },
  });

  await prisma.drawing.create({
    data: {
      drawingNumber: 'DWG-SOL-MEP-HYD-003',
      name: 'Central Firefighting Wet Riser & Sprinkler Schematic Layout',
      revision: 'R1',
      projectId: project1.id,
      buildingId: towerA.id,
      category: 'FIRE_SAFETY',
      status: 'APPROVED',
      uploadedBy: 'Amit Desai',
      fileUrl: '/drawings/DWG-SOL-MEP-HYD-003_R1.dwg',
    },
  });

  console.log('Seeding Meetings & Actions...');
  const m1 = await prisma.meeting.create({
    data: {
      title: 'Weekly Site Coordination & Quality Progress Review #34',
      date: new Date(Date.now() - 3 * 86400000),
      projectId: project1.id,
      location: 'Site Conference Room 1, Tower A Ground Floor',
      participants: 'Ananya Roy, Rajesh Patil, Amit Desai, L&T Site Lead, S&W MEP Lead',
      agenda: 'Review of 6th floor slab casting cycle, MEP shaft handover timeline, cement dispatch delays.',
      mom: 'Decided to expedite cement supply via secondary vendor. L&T committed to completing rebar inspection by Friday.',
      status: 'COMPLETED',
    },
  });

  await prisma.meetingDecision.create({
    data: {
      meetingId: m1.id,
      decision: 'Approved secondary purchase order for 500 bags of OPC 53 cement to overcome primary vendor bottleneck.',
      decidedBy: 'Ananya Roy',
    },
  });

  await prisma.actionItem.create({
    data: {
      meetingId: m1.id,
      title: 'Issue purchase order amendment to secondary vendor by Wednesday noon',
      ownerName: 'Amit Desai',
      dueDate: new Date(Date.now() + 2 * 86400000),
      priority: 'HIGH',
      status: 'OPEN',
    },
  });

  console.log('Seeding Issues, Snags & RFIs...');
  await prisma.issueSnagRfi.create({
    data: {
      type: 'ISSUE',
      projectId: project1.id,
      buildingId: towerA.id,
      floor: '6th Floor',
      location: 'Column C-14 Shear Wall Junction',
      contractorId: c1.id,
      description: 'Honeycombing observed near beam-column junction following shuttering removal. Grouting required.',
      priority: 'CRITICAL',
      ownerName: 'Rajesh Patil',
      dueDate: new Date(Date.now() + 2 * 86400000),
      status: 'OPEN',
    },
  });

  await prisma.issueSnagRfi.create({
    data: {
      type: 'SNAG',
      projectId: project1.id,
      buildingId: towerA.id,
      floor: '3rd Floor',
      location: 'Flat A-302 Balcony Door threshold',
      contractorId: c1.id,
      description: 'Alignment error of 8mm on UPVC slider sill track.',
      priority: 'MEDIUM',
      ownerName: 'Rajesh Patil',
      dueDate: new Date(Date.now() + 5 * 86400000),
      status: 'IN_PROGRESS',
    },
  });

  await prisma.issueSnagRfi.create({
    data: {
      type: 'RFI',
      projectId: project1.id,
      buildingId: towerA.id,
      floor: 'Basement 1',
      location: 'Sewage Treatment Plant Pump Room',
      contractorId: c2.id,
      description: 'RFI #22: Clarification on pipe penetration sleeve specs through retaining wall.',
      priority: 'HIGH',
      ownerName: 'Ananya Roy',
      dueDate: new Date(Date.now() + 3 * 86400000),
      status: 'OPEN',
    },
  });

  console.log('Seeding Daily & Monthly Reports...');
  await prisma.dailyReport.create({
    data: {
      date: new Date(),
      projectId: project1.id,
      buildingId: towerA.id,
      contractorId: c1.id,
      manpower: 84,
      weather: 'Clear 32°C',
      plannedWork: 'Slab reinforcement binding for 7th floor slab, shear wall shuttering',
      completedWork: 'Completed 80% binding of bottom mesh, electrical conduit box placements',
      delayedWork: 'Ready-mix batch dispatch delayed by 1 hour due to traffic advisory',
      materialConsumed: '12 MT Fe 550D Rebars, 400 Bags Cement',
      equipment: 'Tower Crane 1, Concrete Boom Placer, Bar Bending Machine',
      safety: 'Zero lost time accidents. Daily toolbox briefing conducted for 84 workers.',
      remarks: 'Inspection request raised to Site Engineer for tomorrow morning 9:00 AM.',
      submittedBy: 'Harish Verma',
    },
  });

  await prisma.monthlyReport.create({
    data: {
      month: 9,
      year: 2024,
      projectId: project1.id,
      plannedProgress: 42.0,
      actualProgress: 39.5,
      variance: -2.5,
      achievements: 'Casting of 4th and 5th floor slabs completed. Fire NOC obtained.',
      delays: 'Monsoon heavy rain caused 4 lost working days.',
      cost: 'Actual spend within 3.2% of budgeted cashflow.',
      procurement: '100% long-lead steel orders secured.',
      contractor: 'L&T performance rated 92.5%, MEP pacing on schedule.',
      safety: '180,000 Safe Man-hours achieved without LTI.',
      quality: 'Cube compressive test pass rate 99.4%.',
      compliance: 'All quarterly RERA disclosures filed on time.',
      risks: 'Potential supply chain disruption in bulk bitumen and diesel prices.',
      decisions: 'Approve secondary cement vendor tie-up.',
      nextMonthPriorities: 'Complete 6th and 7th floor slabs; initiate lift shaft MEP installation.',
      submittedBy: 'Ananya Roy',
    },
  });

  console.log('Seeding System Settings...');
  await prisma.systemSetting.createMany({
    data: [
      { key: 'RAG_ENABLED', value: 'false', description: 'Master switch for RAG Vector Indexing' },
      { key: 'DEMAND_REMINDER_SCHEDULE', value: '[-7, -3, 0, 3, 7]', description: 'Days offset relative to due date for customer demand reminders' },
      { key: 'MATERIAL_OVERDUE_ALERT_CC', value: 'procurement@builderops.com,admin@builderops.com', description: 'CC emails for overdue material demands' },
      { key: 'CURRENCY_CODE', value: 'INR', description: 'Base operating currency' },
    ],
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
