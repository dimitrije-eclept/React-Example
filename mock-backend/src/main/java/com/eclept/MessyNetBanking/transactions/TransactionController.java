package com.eclept.MessyNetBanking.transactions;

import java.time.LocalDate;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eclept.MessyNetBanking.accounts.AccountRepository;
import com.eclept.MessyNetBanking.common.ApiError;
import com.eclept.MessyNetBanking.common.ApiException;
import com.eclept.MessyNetBanking.common.SerbianFormat;
import com.eclept.MessyNetBanking.common.ValidationErrors;
import com.eclept.MessyNetBanking.transactions.TransactionDtos.TxnItem;
import com.eclept.MessyNetBanking.transactions.TransactionDtos.TxnPage;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Tag(name = "transactions")
public class TransactionController {

    public static final int PAGE_SIZE = 20;

    private final TransactionRepository transactions;
    private final AccountRepository accounts;

    public TransactionController(TransactionRepository transactions, AccountRepository accounts) {
        this.transactions = transactions;
        this.accounts = accounts;
    }

    @GetMapping("/core/v1/txn/history")
    @Operation(summary = "Transaction history",
            description = "**v1** while accounts are v2. Dates in and out are `dd.MM.yyyy`, except `valDate` which "
                    + "is `yyyyMMdd`. `amt` is always positive, sign comes from `dc` (D/C). Pages are 1-based with a "
                    + "fixed size of 20 (not configurable). Newest first. partnerName/partnerAcc/purpose may be null. "
                    + "Pending items have state P.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = TxnPage.class)))
    @ApiResponse(responseCode = "404", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "422", content = @Content(schema = @Schema(implementation = ValidationErrors.class)))
    public TxnPage history(
            @RequestParam String acc,
            @Parameter(description = "dd.MM.yyyy, inclusive", example = "01.09.2026") @RequestParam(required = false) String dateFrom,
            @Parameter(description = "dd.MM.yyyy, inclusive", example = "30.09.2026") @RequestParam(required = false) String dateTo,
            @Parameter(schema = @Schema(allowableValues = {"D", "C"})) @RequestParam(required = false) String dc,
            @Parameter(description = "1-based") @RequestParam(defaultValue = "1") int page) {
        if (accounts.find(acc).isEmpty()) {
            throw ApiException.accountNotFound();
        }
        LocalDate from = parseDate("dateFrom", dateFrom);
        LocalDate to = parseDate("dateTo", dateTo);
        if (dc != null && !dc.isEmpty() && !dc.equals("D") && !dc.equals("C")) {
            throw ApiException.validation("dc", "Dozvoljene vrednosti su D ili C");
        }
        if (page < 1) {
            throw ApiException.validation("page", "Stranica počinje od 1");
        }

        List<Transaction> filtered = transactions.forAccount(acc).stream()
                .filter(t -> from == null || !t.bookDate().isBefore(from))
                .filter(t -> to == null || !t.bookDate().isAfter(to))
                .filter(t -> dc == null || dc.isEmpty() || t.dc().equals(dc))
                .toList();

        int totalPages = (filtered.size() + PAGE_SIZE - 1) / PAGE_SIZE;
        List<TxnItem> items = filtered.stream()
                .skip((long) (page - 1) * PAGE_SIZE)
                .limit(PAGE_SIZE)
                .map(TransactionController::toItem)
                .toList();
        return new TxnPage(items, page, totalPages);
    }

    private static LocalDate parseDate(String field, String value) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        return SerbianFormat.parseDottedDate(value)
                .orElseThrow(() -> ApiException.validation(field, "Format datuma je dd.MM.yyyy"));
    }

    private static TxnItem toItem(Transaction t) {
        return new TxnItem(t.txnRef(), SerbianFormat.dotted(t.bookDate()), SerbianFormat.compact(t.valDate()),
                SerbianFormat.amount(t.amount()), t.dc(), t.ccy(), t.partnerName(), t.partnerAcc(), t.purpose(),
                t.state());
    }
}
