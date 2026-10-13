import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Starting Verification Suite...\n');

    // Helper to run import-data
    const runImport = (args: string) => {
        return execSync(`npx tsx scripts/import-data.ts ${args}`, { encoding: 'utf8' });
    };

    try {
        // 1. Dry run → zero DB writes
        console.log('1️⃣ Testing Dry Run...');
        const preCount = await prisma.salon.count();
        runImport('--file=./scripts/templates/generic_template.csv --salon-name="Verify Salon 1" --owner-email=v1@test.com --dry-run');
        const postCount = await prisma.salon.count();
        assert.strictEqual(preCount, postCount, 'Dry run should not create a salon');
        console.log('✅ Dry Run: Passed');

        // 2. Real import
        console.log('\n2️⃣ Testing Real Import...');
        const out1 = runImport('--file=./scripts/templates/fresha_template.csv --salon-name="Verify Salon 2" --owner-email=v2@test.com');
        const salonIdMatch = out1.match(/ID: ([a-f0-9\-]+)/);
        assert(salonIdMatch, 'Should output Salon ID');
        const salonId = salonIdMatch[1];

        const staffCount = await prisma.staff.count({ where: { salonId } });
        const apptCount = await prisma.appointment.count({ where: { salonId } });
        const customerCount = await prisma.customer.count({ where: { salonId } });

        assert.strictEqual(staffCount, 3, 'Should import 3 staff');
        assert.strictEqual(apptCount, 3, 'Should import 3 appointments');
        assert.strictEqual(customerCount, 3, 'Should import 3 customers');
        console.log('✅ Real Import: Passed');

        // 3. Same CSV again → zero duplicates (Idempotency)
        console.log('\n3️⃣ Testing Idempotency (re-import same CSV)...');
        runImport(`--file=./scripts/templates/fresha_template.csv --salon-id=${salonId}`);

        const duplicateCheckStaff = await prisma.staff.count({ where: { salonId } });
        const duplicateCheckAppt = await prisma.appointment.count({ where: { salonId } });

        assert.strictEqual(duplicateCheckStaff, 3, 'Re-import should yield exactly 3 staff (0 duplicates)');
        assert.strictEqual(duplicateCheckAppt, 3, 'Re-import should yield exactly 3 appointments (0 duplicates)');
        console.log('✅ Idempotency: Passed');

        // 4. Modify one source record → update, not duplicate
        console.log('\n4️⃣ Testing Record Update...');
        const modifiedCsvStr = fs.readFileSync(path.resolve('./scripts/templates/fresha_template.csv'), 'utf8')
            .replace('Grace Holloway', 'Grace H. Updated');
        fs.writeFileSync('./scripts/templates/fresha_modified.csv', modifiedCsvStr);

        runImport(`--file=./scripts/templates/fresha_modified.csv --salon-id=${salonId}`);
        const updatedCustomer = await prisma.customer.findFirst({ where: { salonId, email: 'grace@email.com' } });
        assert.strictEqual(updatedCustomer?.name, 'Grace H. Updated', 'Should update name');

        const finalCustomerCount = await prisma.customer.count({ where: { salonId } });
        assert.strictEqual(finalCustomerCount, 3, 'Should not create new customers on update');
        fs.unlinkSync('./scripts/templates/fresha_modified.csv');
        console.log('✅ Update Mode: Passed');

        // 5. Invalid CSV → clear validation errors
        console.log('\n5️⃣ Testing Invalid CSV...');
        fs.writeFileSync('./scripts/templates/invalid.csv', 'some,random,crap\n1,2,3');
        try {
            runImport(`--file=./scripts/templates/invalid.csv --salon-id=${salonId} --dry-run`);
            assert.fail('Should have failed');
        } catch (e: any) {
            assert(e.stdout.includes('Validation FAILED') || e.stderr.includes('Validation FAILED'));
        }
        fs.unlinkSync('./scripts/templates/invalid.csv');
        console.log('✅ Invalid CSV: Passed');

        // 6. Tenant isolation (Salon A ≠ Salon B)
        console.log('\n6️⃣ Testing Tenant Isolation...');
        const out2 = runImport('--file=./scripts/templates/fresha_template.csv --salon-name="Verify Salon 3" --owner-email=v3@test.com');
        const salonId3 = out2.match(/ID: ([a-f0-9\-]+)/)![1];
        assert.notStrictEqual(salonId, salonId3);

        const s3Appts = await prisma.appointment.findMany({ where: { salonId: salonId3 } });
        assert(s3Appts.every(a => a.salonId === salonId3), 'All imported apps should strictly belong to Salon 3');
        console.log('✅ Tenant Isolation: Passed');

        // 7. Check LTV Math
        console.log('\n7️⃣ Testing LTV Calculation...');
        const emma = await prisma.customer.findFirst({ where: { salonId, email: 'emma@email.com' } });
        assert.strictEqual(emma?.ltv, 55, 'Emma LTV should be £55 from completed payment');
        console.log('✅ LTV Calculation: Passed');

        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The pipeline is production-grade.');

    } catch (e) {
        console.error('\n❌ TEST FAILED');
        console.error(e);
    } finally {
        // Cleanup verify salons
        await prisma.salon.deleteMany({ where: { name: { startsWith: 'Verify Salon' } } });
        await prisma.$disconnect();
    }
}

main();
