import { Types } from 'mongoose';

const oid = (value) => new Types.ObjectId(value);
const date = (value) => new Date(`${value}T00:00:00.000Z`);
const createdAt = date('2026-01-05');

const ids = {
  projects: [
    oid('66d000000000000000000001'),
    oid('66d000000000000000000002'),
    oid('66d000000000000000000003'),
  ],
  contracts: [
    oid('66d100000000000000000001'),
    oid('66d100000000000000000002'),
    oid('66d100000000000000000003'),
    oid('66d100000000000000000004'),
  ],
};

const taskDefinitions = [
  ['Hồ sơ thiết kế phê duyệt', 'P.KTDA'],
  ['Chuẩn bị vật tư, pháp lý, mặt bằng', 'P.KTDA'],
  ['Tổ chức thi công', 'P.KTDA'],
  ['Kết nối nhà mạng CĐBR/IBS', 'P.KDHT'],
  ['Bàn giao đưa vào VHKT', 'P.KTDA'],
];

function metadata(demoSeedKey) {
  return { demoSeedKey, createdAt, updatedAt: createdAt };
}

function actorFields(actorId) {
  return { createdBy: actorId, updatedBy: actorId };
}

function taskDocuments(actorId) {
  const projectSchedules = [
    [
      ['2025-10-01', '2025-10-31', '2025-10-28', 'done'],
      ['2025-11-01', '2025-11-30', '2025-11-27', 'done'],
      ['2025-12-01', '2026-02-28', '2026-02-25', 'done'],
      ['2026-03-01', '2026-04-30', '2026-04-29', 'done'],
      ['2026-05-01', '2026-07-15', undefined, 'in_progress'],
    ],
    [
      ['2026-01-01', '2026-02-15', '2026-02-12', 'done'],
      ['2026-02-16', '2026-04-15', '2026-04-10', 'done'],
      ['2026-04-16', '2026-08-31', undefined, 'in_progress'],
      ['2026-09-01', '2026-10-31', undefined, 'todo'],
      ['2026-11-01', '2026-12-31', undefined, 'todo'],
    ],
    [
      ['2026-03-01', '2026-04-30', undefined, 'in_progress'],
      [undefined, undefined, undefined, 'todo'],
      [undefined, undefined, undefined, 'todo'],
      [undefined, undefined, undefined, 'todo'],
      [undefined, undefined, undefined, 'todo'],
    ],
  ];
  let sequence = 1;
  return projectSchedules.flatMap((schedule, projectIndex) =>
    schedule.map((values, stepIndex) => {
      const [plannedStart, plannedEnd, actualEnd, status] = values;
      const task = {
        _id: oid(`66d2${String(sequence).padStart(20, '0')}`),
        projectId: ids.projects[projectIndex],
        step: stepIndex + 1,
        name: taskDefinitions[stepIndex][0],
        department: taskDefinitions[stepIndex][1],
        status,
        ...(plannedStart ? { plannedStartDate: date(plannedStart) } : {}),
        ...(plannedEnd ? { plannedEndDate: date(plannedEnd) } : {}),
        ...(actualEnd ? { actualEndDate: date(actualEnd) } : {}),
        ...actorFields(actorId),
        ...metadata(`task:${projectIndex + 1}:${stepIndex + 1}`),
      };
      sequence += 1;
      return task;
    }),
  );
}

export function createDemoSeedPlan(actor) {
  const actorId = oid(actor.id);
  const projects = [
    {
      _id: ids.projects[0],
      code: 'IDS-DEMO-01',
      name: 'The Global City',
      description: 'Dự án mẫu đã vận hành, có doanh thu và công nợ quá hạn.',
      status: 'active',
      operationalStatus: 'operational',
      signedDate: date('2025-09-15'),
      address: 'Đỗ Xuân Hợp, TP. Thủ Đức',
      province: 'Hồ Chí Minh',
      investor: 'Masterise Homes',
      projectType: 'Khu đô thị',
      scaleDescription: '2.000 căn hộ và khu thương mại',
      unitCount: 2000,
      landAreaHa: 117,
      investmentUnit: 'IDS Demo',
      dataSources: ['Teldata', 'IBS', 'DoanhThu'],
      dataConflict: false,
      carrierContractCount: 2,
      capex: 2_400_000_000,
      startDate: date('2025-10-01'),
      dueDate: date('2026-07-31'),
      createdBy: actorId,
      ...metadata('project:global-city'),
    },
    {
      _id: ids.projects[1],
      code: 'IDS-DEMO-02',
      name: 'Eco Central Park',
      description: 'Dự án mẫu đang khai thác một phần và cần đối soát dữ liệu.',
      status: 'active',
      operationalStatus: 'partial',
      signedDate: date('2025-12-20'),
      province: 'Nghệ An',
      investor: 'EcoPark',
      projectType: 'Khu đô thị sinh thái',
      scaleDescription: '1.250 căn hộ',
      unitCount: 1250,
      investmentUnit: 'IDS Demo',
      dataSources: ['Teldata', 'DoanhThu'],
      dataConflict: true,
      carrierContractCount: 1,
      capex: 1_800_000_000,
      startDate: date('2026-01-01'),
      dueDate: date('2026-12-31'),
      createdBy: actorId,
      ...metadata('project:eco-central-park'),
    },
    {
      _id: ids.projects[2],
      code: 'IDS-DEMO-03',
      name: 'Sun Marina Town',
      description: 'Dự án mẫu đang thi công, thiếu CAPEX và kế hoạch chi tiết.',
      status: 'planning',
      operationalStatus: 'in_progress',
      province: 'Quảng Ninh',
      investor: 'Sun Group',
      projectType: 'Đô thị biển',
      scaleDescription: '900 căn hộ và shophouse',
      unitCount: 900,
      investmentUnit: 'IDS Demo',
      dataSources: ['IBS'],
      dataConflict: false,
      carrierContractCount: 1,
      startDate: date('2026-03-01'),
      dueDate: date('2027-03-31'),
      createdBy: actorId,
      ...metadata('project:sun-marina-town'),
    },
  ];
  const contracts = [
    [
      ids.contracts[0],
      ids.projects[0],
      'Viettel',
      'teldata',
      1600,
      'apartment',
      55_000,
      'monthly',
    ],
    [
      ids.contracts[1],
      ids.projects[0],
      'VNPT',
      'ibs',
      85_000,
      'm2',
      8_500,
      'quarterly',
    ],
    [
      ids.contracts[2],
      ids.projects[1],
      'MobiFone',
      'teldata',
      800,
      'apartment',
      48_000,
      'monthly',
    ],
    [
      ids.contracts[3],
      ids.projects[2],
      'Viettel',
      'ibs',
      42_000,
      'm2',
      7_500,
      'quarterly',
    ],
  ].map(
    (
      [
        id,
        projectId,
        carrier,
        serviceType,
        quantity,
        unit,
        unitPrice,
        paymentCycle,
      ],
      index,
    ) => ({
      _id: id,
      projectId,
      carrier,
      serviceType,
      quantity,
      unit,
      unitPrice,
      paymentCycle,
      startDate: date(index < 2 ? '2026-01-01' : '2026-04-01'),
      endDate: date(index < 2 ? '2026-12-31' : '2027-03-31'),
      ...actorFields(actorId),
      ...metadata(`contract:${index + 1}`),
    }),
  );
  const memberships = projects.map((project, index) => ({
    _id: oid(`66d70000000000000000000${index + 1}`),
    projectId: project._id,
    userId: actorId,
    role: 'owner',
    createdBy: actorId,
    ...metadata(`membership:${index + 1}:admin`),
  }));
  const revenue = [
    [1, 1, 420_000_000, 250_000_000],
    [1, 2, 520_000_000, 270_000_000],
    [1, 3, 610_000_000, 300_000_000],
    [1, 4, 780_000_000, 340_000_000],
    [2, 1, 180_000_000, 130_000_000],
    [2, 2, 260_000_000, 160_000_000],
    [2, 3, 310_000_000, 175_000_000],
  ].map(([projectNumber, quarter, value, cost], index) => ({
    _id: oid(`66d3000000000000000000${String(index + 1).padStart(2, '0')}`),
    projectId: ids.projects[projectNumber - 1],
    fiscalYear: 2025,
    quarter,
    revenue: value,
    cost,
    ...actorFields(actorId),
    ...metadata(`revenue:${projectNumber}:2025:${quarter}`),
  }));
  const receivables = [
    [1, 1, 'Tháng 07/2026', 180_000_000, 60_000_000, '2026-07-31', undefined],
    [1, 2, 'Q2/2026', 240_000_000, 240_000_000, '2026-06-30', '2026-06-25'],
    [2, 3, 'Tháng 11/2026', 95_000_000, 0, '2026-11-30', undefined],
    [3, 4, 'Q2/2026', 120_000_000, 0, '2026-05-31', undefined],
  ].map(
    (
      [
        projectNumber,
        contractNumber,
        periodLabel,
        amountDue,
        amountPaid,
        dueDate,
        paidDate,
      ],
      index,
    ) => ({
      _id: oid(`66d40000000000000000000${index + 1}`),
      projectId: ids.projects[projectNumber - 1],
      carrierContractId: ids.contracts[contractNumber - 1],
      periodLabel,
      amountDue,
      amountPaid,
      dueDate: date(dueDate),
      ...(paidDate ? { paidDate: date(paidDate) } : {}),
      note:
        index === 0
          ? 'Đang đối soát số liệu với nhà mạng.'
          : 'Dữ liệu demo UAT.',
      ...actorFields(actorId),
      ...metadata(`receivable:${index + 1}`),
    }),
  );
  const opportunities = [
    [
      'Khu đô thị Đông Anh',
      'north',
      'Hà Nội',
      'Tập đoàn Demo A',
      'Anh Minh',
      1,
      false,
    ],
    [
      'Tổ hợp nghỉ dưỡng Hội An',
      'central',
      'Quảng Nam',
      'Tập đoàn Demo B',
      'Chị Lan',
      2,
      true,
    ],
    [
      'Chung cư Riverside',
      'south',
      'Bình Dương',
      'Tập đoàn Demo C',
      'Anh Hùng',
      3,
      true,
    ],
    [
      'Khu căn hộ Midtown',
      'south',
      'Hồ Chí Minh',
      'Tập đoàn Demo D',
      'Chị Hà',
      4,
      true,
    ],
  ].map(
    (
      [name, region, province, investor, ownerName, stage, feasible],
      index,
    ) => ({
      _id: oid(`66d50000000000000000000${index + 1}`),
      name,
      region,
      province,
      investor,
      projectType: 'Khu đô thị / căn hộ',
      ownerName,
      stage,
      feasible,
      unitCount: 500 + index * 250,
      lastInteractionDate: date(`2026-0${index + 4}-15`),
      note: 'Hồ sơ cơ hội dùng cho nghiệm thu UAT.',
      ...actorFields(actorId),
      ...metadata(`opportunity:${index + 1}`),
    }),
  );
  const activities = projects.map((project, index) => ({
    _id: oid(`66d60000000000000000000${index + 1}`),
    projectId: project._id,
    type: 'comment',
    content: [
      'Đã hoàn tất đối soát tiến độ vận hành với các bên liên quan.',
      'Cần kiểm tra lại dữ liệu nguồn trước kỳ báo cáo tiếp theo.',
      'Đang bổ sung kế hoạch chi tiết và hồ sơ triển khai.',
    ][index],
    authorId: actorId,
    authorDisplayName: actor.displayName,
    authorEmail: actor.email,
    ...metadata(`activity:${index + 1}`),
  }));

  return [
    { collection: 'projects', documents: projects },
    { collection: 'project_memberships', documents: memberships },
    { collection: 'tasks', documents: taskDocuments(actorId) },
    { collection: 'carrier_contracts', documents: contracts },
    { collection: 'revenue_actuals', documents: revenue },
    { collection: 'receivables', documents: receivables },
    { collection: 'opportunities', documents: opportunities },
    { collection: 'project_activities', documents: activities },
  ];
}
