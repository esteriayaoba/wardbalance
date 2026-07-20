import "dotenv/config";
import { OtpService } from "../src/lib/auth/otp.service";

async function runTests() {
  const schoolId = "test-school-123";
  const identifier = "test-parent-phone";

  console.log("=== STARTING OTP HARDENING UNIT TESTS ===");

  // Reset failures before starting
  await OtpService.clearFailures(schoolId, identifier);

  // Test 1: Generate OTP
  console.log("\n[Test 1] Generating OTP...");
  const { otp, expiresInSeconds } = await OtpService.generateOtp(schoolId, identifier);
  console.log(`- Generated OTP: ${otp}, Expires in: ${expiresInSeconds}s`);
  if (expiresInSeconds !== 600) {
    throw new Error("FAIL: Expiry window must be 10 minutes (600s)");
  }
  console.log("PASS: OTP generated with correct expiration.");

  // Test 2: Double Verification / One-time use policy
  console.log("\n[Test 2] Verification one-time use policy...");
  const verify1 = await OtpService.verifyOtp(schoolId, identifier, otp);
  console.log(`- First verify: ${JSON.stringify(verify1)}`);
  if (!verify1.success) {
    throw new Error(`FAIL: First verification should succeed, got: ${verify1.error}`);
  }
  const verify2 = await OtpService.verifyOtp(schoolId, identifier, otp);
  console.log(`- Second verify (replay): ${JSON.stringify(verify2)}`);
  if (verify2.success) {
    throw new Error("FAIL: Replaying same OTP should fail");
  }
  console.log("PASS: OTP successfully consumed after first use.");

  // Test 3: Lockout Brute-Force limit
  console.log("\n[Test 3] Lockout brute-force limit...");
  await OtpService.clearFailures(schoolId, identifier);

  // Generate a new OTP to fail against
  const { otp: newOtp } = await OtpService.generateOtp(schoolId, identifier);

  for (let i = 1; i <= 5; i++) {
    // We send an incorrect code "000000"
    const res = await OtpService.verifyOtp(schoolId, identifier, "000000");
    console.log(`- Attempt ${i}: success=${res.success}, error="${res.error}", code=${res.code}`);
    if (i === 5) {
      if (res.code !== "LOCKED") {
        throw new Error("FAIL: 5th failure must trigger LOCKED status");
      }
    }
  }

  // Attempt with correct OTP after lockout
  const resWithValid = await OtpService.verifyOtp(schoolId, identifier, newOtp);
  console.log(`- Verify with valid OTP during lockout: success=${resWithValid.success}, code=${resWithValid.code}, error="${resWithValid.error}"`);
  if (resWithValid.success || resWithValid.code !== "LOCKED") {
    throw new Error("FAIL: Valid OTP should be blocked during lockout");
  }
  console.log("PASS: Lockout active and brute-force blocked successfully.");

  // Clean up
  await OtpService.clearFailures(schoolId, identifier);
  console.log("\n=== ALL OTP HARDENING TESTS COMPLETED SUCCESSFULLY ===");
}

runTests().catch((err) => {
  console.error("\nTESTS FAILED:", err);
  process.exit(1);
});
