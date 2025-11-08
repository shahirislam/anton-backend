# Stripe Payment Integration - Mobile Team Guide

This guide is for the **Flutter/mobile development team** to integrate Stripe payments with the backend API.

## Quick Overview

**What the Backend Does:**
- ✅ Creates payment intents (returns `client_secret`)
- ✅ Receives webhooks from Stripe (creates tickets automatically)
- ✅ Provides payment status endpoints

**What You Need to Do:**
- ✅ Install Stripe Flutter SDK
- ✅ Call backend to create payment intent
- ✅ Use Stripe SDK to collect payment and confirm
- ✅ Check payment status after confirmation

## Prerequisites

1. **Stripe Account**: Backend team has set up Stripe (test mode)
2. **Backend API**: Backend is running and accessible
3. **Stripe Flutter SDK**: Install the Stripe package

## Step 1: Install Stripe Flutter SDK

Add to your `pubspec.yaml`:

```yaml
dependencies:
  flutter_stripe: ^11.1.0
```

Then run:
```bash
flutter pub get
```

## Step 2: Initialize Stripe

In your app initialization (e.g., `main.dart`):

```dart
import 'package:flutter_stripe/flutter_stripe.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Stripe with publishable key
  Stripe.publishableKey = "pk_test_..."; // Get from backend team or Stripe Dashboard
  
  await Stripe.instance.applySettings();
  
  runApp(MyApp());
}
```

**Note**: You'll need the **publishable key** (starts with `pk_test_` or `pk_live_`). This is safe to include in your mobile app code.

## Step 3: Backend API Endpoints

### Base URL
```
https://your-api-domain.com/api/v1
```

### Authentication
All endpoints (except webhook) require authentication:
```
Authorization: Bearer <access_token>
```

## API Endpoints You'll Use

### 1. Create Payment Intent (Single Ticket Purchase)

**Endpoint**: `POST /payments/create-intent/single`

**Request:**
```dart
final response = await http.post(
  Uri.parse('$baseUrl/payments/create-intent/single'),
  headers: {
    'Authorization': 'Bearer $accessToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'competition_id': 'competition-uuid',
    'quantity': 2, // Optional, defaults to 1
  }),
);

final data = jsonDecode(response.body);
final clientSecret = data['data']['client_secret'];
final paymentIntentId = data['data']['payment_intent_id'];
```

**Response:**
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "payment_intent_id": "pi_...",
    "client_secret": "pi_..._secret_...",
    "amount": 20.00,
    "currency": "usd"
  }
}
```

### 2. Create Payment Intent (Cart Checkout)

**Endpoint**: `POST /payments/create-intent/checkout`

**Request:**
```dart
final response = await http.post(
  Uri.parse('$baseUrl/payments/create-intent/checkout'),
  headers: {
    'Authorization': 'Bearer $accessToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'points_to_redeem': 500, // Optional, defaults to 0
  }),
);

final data = jsonDecode(response.body);
final clientSecret = data['data']['client_secret'];
final paymentIntentId = data['data']['payment_intent_id'];
final discountAmount = data['data']['discount_amount'];
final pointsRedeemed = data['data']['points_redeemed'];
```

**Response:**
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "payment_intent_id": "pi_...",
    "client_secret": "pi_..._secret_...",
    "amount": 15.00,
    "currency": "usd",
    "cart_total": 20.00,
    "discount_amount": 5.00,
    "points_redeemed": 500
  }
}
```

### 3. Get Payment Status

**Endpoint**: `GET /payments/status/:payment_intent_id`

**Request:**
```dart
final response = await http.get(
  Uri.parse('$baseUrl/payments/status/$paymentIntentId'),
  headers: {
    'Authorization': 'Bearer $accessToken',
  },
);

final data = jsonDecode(response.body);
final status = data['data']['status'];
final ticketsCreated = data['data']['tickets_created'];
```

**Response:**
```json
{
  "success": true,
  "message": "Payment status retrieved successfully",
  "data": {
    "payment_intent_id": "pi_...",
    "status": "succeeded",
    "amount": 20.00,
    "currency": "usd",
    "tickets_created": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:01.000Z"
  }
}
```

**Status Values:**
- `pending` - Payment intent created, waiting for payment
- `processing` - Payment is being processed
- `succeeded` - Payment successful, tickets created ✅
- `failed` - Payment failed
- `canceled` - Payment was canceled
- `refunded` - Payment was refunded

## Step 4: Complete Payment Flow

### Single Ticket Purchase Flow

```dart
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> purchaseTickets({
  required String competitionId,
  required int quantity,
  required String accessToken,
}) async {
  try {
    // Step 1: Create payment intent
    final intentResponse = await http.post(
      Uri.parse('$baseUrl/payments/create-intent/single'),
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'competition_id': competitionId,
        'quantity': quantity,
      }),
    );

    if (intentResponse.statusCode != 201) {
      throw Exception('Failed to create payment intent');
    }

    final intentData = jsonDecode(intentResponse.body);
    final clientSecret = intentData['data']['client_secret'];
    final paymentIntentId = intentData['data']['payment_intent_id'];

    // Step 2: Confirm payment with Stripe
    await Stripe.instance.confirmPayment(
      clientSecret,
      paymentMethodData: PaymentMethodData(
        // Stripe will handle payment method collection
      ),
    );

    // Step 3: Wait a moment for webhook to process
    await Future.delayed(Duration(seconds: 2));

    // Step 4: Check payment status
    bool ticketsCreated = false;
    int attempts = 0;
    while (!ticketsCreated && attempts < 10) {
      final statusResponse = await http.get(
        Uri.parse('$baseUrl/payments/status/$paymentIntentId'),
        headers: {
          'Authorization': 'Bearer $accessToken',
        },
      );

      final statusData = jsonDecode(statusResponse.body);
      final status = statusData['data']['status'];
      ticketsCreated = statusData['data']['tickets_created'];

      if (status == 'succeeded' && ticketsCreated) {
        // Success! Tickets are created
        print('Payment successful! Tickets created.');
        return;
      } else if (status == 'failed' || status == 'canceled') {
        throw Exception('Payment $status');
      }

      // Wait before next check
      await Future.delayed(Duration(seconds: 1));
      attempts++;
    }

    if (!ticketsCreated) {
      throw Exception('Payment succeeded but tickets not created yet. Please check later.');
    }
  } catch (e) {
    print('Payment error: $e');
    rethrow;
  }
}
```

### Cart Checkout Flow

```dart
Future<void> checkoutCart({
  required int pointsToRedeem,
  required String accessToken,
}) async {
  try {
    // Step 1: Create payment intent
    final intentResponse = await http.post(
      Uri.parse('$baseUrl/payments/create-intent/checkout'),
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'points_to_redeem': pointsToRedeem,
      }),
    );

    if (intentResponse.statusCode != 201) {
      throw Exception('Failed to create payment intent');
    }

    final intentData = jsonDecode(intentResponse.body);
    final clientSecret = intentData['data']['client_secret'];
    final paymentIntentId = intentData['data']['payment_intent_id'];
    final finalAmount = intentData['data']['amount'];
    final discountAmount = intentData['data']['discount_amount'];

    // Step 2: Confirm payment with Stripe
    await Stripe.instance.confirmPayment(
      clientSecret,
      paymentMethodData: PaymentMethodData(),
    );

    // Step 3: Wait for webhook and check status
    bool ticketsCreated = false;
    int attempts = 0;
    while (!ticketsCreated && attempts < 10) {
      final statusResponse = await http.get(
        Uri.parse('$baseUrl/payments/status/$paymentIntentId'),
        headers: {
          'Authorization': 'Bearer $accessToken',
        },
      );

      final statusData = jsonDecode(statusResponse.body);
      final status = statusData['data']['status'];
      ticketsCreated = statusData['data']['tickets_created'];

      if (status == 'succeeded' && ticketsCreated) {
        // Success! Tickets created and cart cleared
        print('Checkout successful! Tickets created.');
        return;
      } else if (status == 'failed' || status == 'canceled') {
        throw Exception('Payment $status');
      }

      await Future.delayed(Duration(seconds: 1));
      attempts++;
    }

    if (!ticketsCreated) {
      throw Exception('Payment succeeded but tickets not created yet. Please check later.');
    }
  } catch (e) {
    print('Checkout error: $e');
    rethrow;
  }
}
```

## Step 5: Error Handling

### Common Errors

**1. Payment Intent Creation Fails**
- Check authentication token is valid
- Verify competition exists and is active
- Check user hasn't exceeded max tickets per person
- Ensure amount is at least $0.50

**2. Payment Confirmation Fails**
- User canceled payment
- Card declined
- Network error
- Show appropriate error message to user

**3. Payment Succeeds but Tickets Not Created**
- Webhook may be delayed (wait a few seconds)
- Poll payment status endpoint
- If still not created after 10 seconds, show message to check later
- Backend team should investigate webhook logs

### Error Response Format

```json
{
  "success": false,
  "message": "Error message here",
  "errors": {
    // Optional additional error details
  }
}
```

## Step 6: Testing

### Test Mode

1. Use test API keys (backend team provides)
2. Use Stripe test cards:
   - **Success**: `4242 4242 4242 4242`
   - **Declined**: `4000 0000 0000 0002`
   - **Requires Auth**: `4000 0025 0000 3155`
3. Use any future expiry date (e.g., `12/25`)
4. Use any 3-digit CVC (e.g., `123`)
5. Use any 5-digit ZIP (e.g., `12345`)

### Testing Checklist

- [ ] Create payment intent for single purchase
- [ ] Create payment intent for cart checkout
- [ ] Confirm payment with test card
- [ ] Verify payment status updates to `succeeded`
- [ ] Verify `tickets_created` becomes `true`
- [ ] Test payment failure (declined card)
- [ ] Test payment cancellation
- [ ] Verify tickets appear in user's ticket list after successful payment

## Important Notes

### 1. Payment Flow
- **You create payment intent** → Backend returns `client_secret`
- **You confirm payment** → Stripe processes payment
- **Stripe sends webhook** → Backend creates tickets automatically
- **You check status** → Verify tickets were created

### 2. Webhooks
- Webhooks are handled by the backend (you don't need to do anything)
- Backend automatically creates tickets when webhook is received
- There may be a 1-2 second delay between payment and ticket creation

### 3. Polling Payment Status
- After confirming payment, poll the status endpoint
- Check every 1 second, up to 10 times
- Stop when `status == 'succeeded'` and `tickets_created == true`
- If payment succeeds but tickets not created after 10 seconds, show message to user

### 4. Points Redemption
- User can redeem points during cart checkout
- 100 points = $1 discount
- Minimum redemption: 100 points
- Points are deducted from user's balance
- Discount is applied to final payment amount

### 5. User Experience
- Show loading state while creating payment intent
- Show Stripe payment sheet for payment confirmation
- Show loading state while checking payment status
- Show success message when tickets are created
- Show error message if payment fails

## Example UI Flow

```dart
// 1. User taps "Purchase Tickets"
onPressed: () async {
  setState(() => isLoading = true);
  
  try {
    // 2. Create payment intent
    final intent = await createPaymentIntent(...);
    
    // 3. Show Stripe payment sheet
    await Stripe.instance.presentPaymentSheet(
      clientSecret: intent.clientSecret,
    );
    
    // 4. Confirm payment
    await confirmPayment(intent.clientSecret);
    
    // 5. Check status and show success
    final status = await checkPaymentStatus(intent.paymentIntentId);
    if (status.ticketsCreated) {
      showSuccessDialog('Tickets purchased successfully!');
      // Refresh ticket list
      loadUserTickets();
    }
  } catch (e) {
    showErrorDialog('Payment failed: ${e.toString()}');
  } finally {
    setState(() => isLoading = false);
  }
}
```

## Questions?

### For Backend Team:
- API endpoint URLs
- Authentication tokens
- Stripe publishable key
- Test account credentials

### For Stripe:
- [Stripe Flutter Documentation](https://stripe.dev/stripe-flutter/)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Support](https://support.stripe.com)

## Summary

**What You Need to Do:**
1. ✅ Install `flutter_stripe` package
2. ✅ Initialize Stripe with publishable key
3. ✅ Call backend to create payment intent
4. ✅ Use Stripe SDK to confirm payment
5. ✅ Poll payment status until tickets are created
6. ✅ Show success/error messages to user

**What the Backend Does:**
- Creates payment intents
- Receives webhooks from Stripe
- Creates tickets automatically
- Provides status endpoints

**You Don't Need to:**
- ❌ Handle webhooks (backend does this)
- ❌ Create tickets manually (backend does this)
- ❌ Store payment details (Stripe handles this)

Good luck with the integration! 🚀

